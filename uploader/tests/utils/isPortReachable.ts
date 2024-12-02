import net from 'node:net';

// @ts-ignore
export default async function isPortReachable(port: number, {host, timeout = 1000}: {host:string, timeout?:number} = {}) {

	const testConnection = (resolve:(value: unknown)=>void, reject:(value: unknown)=>void) => {
		const socket = new net.Socket();

		const onError = () => {
			socket.destroy();
			setTimeout(()=> {
				testConnection(resolve, reject)
			}, 1000)
		};

		socket.setTimeout(500);
		socket.once('error', onError);
		socket.once('timeout', onError);

		socket.connect(port, host, () => {
			socket.end();
			resolve(0);
		});
	};
	const promise = new Promise(testConnection);

	try {
		await promise;
		return true;
	} catch {
		return false;
	}
}
