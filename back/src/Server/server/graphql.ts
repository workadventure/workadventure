import { parse } from 'query-string';
import { createAsyncIterator, forAwaitEach, isAsyncIterable } from 'iterall';
import { HttpResponse, HttpRequest } from 'uWebSockets.js';
// client -> server
const GQL_START = 'start';
const GQL_STOP = 'stop';
// server -> client
const GQL_DATA = 'data';
const GQL_QUERY = 'query';

async function getGraphqlParams(res: HttpResponse, req: HttpRequest) {
  // query and variables
  const queryParams = parse(req.getQuery());
  let { query, variables, operationName } = queryParams;
  if (typeof variables === 'string') variables = JSON.parse(variables);

  // body
  if (res && typeof res.json === 'function') {
    const data = await res.json();
    query = data.query || query;
    variables = data.variables || variables;
    operationName = data.operationName || operationName;
  }
  return {
    source: query,
    variableValues: variables,
    operationName
  };
}

function graphqlPost(schema, graphqlOptions: any = {}, graphql: any = {}) {
  const execute = graphql.graphql || require('graphql').graphql;

  return async (res: HttpResponse, req: HttpRequest) => {
    res.onAborted(console.error);

    res.writeHeader('content-type', 'application/json');
    res.end(
      JSON.stringify(
        await execute({
          schema,
          ...(await getGraphqlParams(res, req)),
          ...graphqlOptions,
          contextValue: {
            res,
            req,
            ...(graphqlOptions &&
              (graphqlOptions.contextValue ||
                (graphqlOptions.contextFxn && (await graphqlOptions.contextFxn(res, req)))))
          }
        })
      )
    );
  };
}

function stopGqsSubscription(operations, reqOpId) {
  if (!reqOpId) return;
  operations[reqOpId] && operations[reqOpId].return && operations[reqOpId].return();
  delete operations[reqOpId];
}

function graphqlWs(schema, graphqlOptions: any = {}, uwsOptions: any = {}, graphql: any = {}) {
  const subscribe = graphql.subscribe || require('graphql').subscribe;
  const execute = graphql.graphql || require('graphql').graphql;

  return {
    open: (ws, req) => {
      ws.req = req;
      ws.operations = {};
      ws.opId = 1;
    },
    message: async (ws, message) => {
      const { type, payload = {}, id: reqOpId } = JSON.parse(Buffer.from(message).toString('utf8'));
      let opId;
      if (reqOpId) {
        opId = reqOpId;
      } else {
        opId = ws.opId++;
      }

      const params = {
        schema,
        source: payload.query,
        variableValues: payload.variables,
        operationName: payload.operationName,
        contextValue: {
          ws,
          ...(graphqlOptions &&
            (graphqlOptions.contextValue ||
              (graphqlOptions.contextFxn && (await graphqlOptions.contextFxn(ws)))))
        },
        ...graphqlOptions
      };

      switch (type) {
        case GQL_START:
          stopGqsSubscription(ws.operations, opId);

          // eslint-disable-next-line no-case-declarations
          let asyncIterable = await subscribe(
            params.schema,
            graphql.parse(params.source),
            params.rootValue,
            params.contextValue,
            params.variableValues,
            params.operationName
          );
          asyncIterable = isAsyncIterable(asyncIterable)
            ? asyncIterable
            : createAsyncIterator([asyncIterable]);

          forAwaitEach(asyncIterable, result =>
            ws.send(
              JSON.stringify({
                id: opId,
                type: GQL_DATA,
                payload: result
              })
            )
          );
          break;

        case GQL_STOP:
          stopGqsSubscription(ws.operations, reqOpId);
          break;

        default:
          ws.send(JSON.stringify({ payload: await execute(params), type: GQL_QUERY, id: opId }));
          break;
      }
    },
    idleTimeout: 24 * 60 * 60,
    ...uwsOptions
  };
}

export { graphqlPost, graphqlWs };
