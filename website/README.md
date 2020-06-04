Basic Webpack config for simple website.

Install all packages:
```
$ npm install
```

Run webpack
```
$ npm run build
```

Done! Open index.html in browser for a cat image.

----

### Notice about production mode and postcss.config.js
In *postcss.config.js* there is a check for **process.env.NODE_ENV** variable. The thing is even if you set Webpack mode to production it *won't* automatically change Node environment variable.

The simplest way to configure this is to install *cross-env* package:
```
$ npm install --save-dev cross-env
```

Then just add another npm script in *package.json* for production mode:
```javascript
"scripts": {
  "build": "webpack --config webpack.config.js",
  "build-production": "cross-env NODE_ENV=production webpack --config webpack.config.js"
}
```

Now when you run `npm run build-production` the *process.env.NODE_ENV* variable will be production and postcss.config.js check is going to work:
```javascript
if(process.env.NODE_ENV === 'production') {
    module.exports = {
        plugins: [
            require('autoprefixer'),
            require('cssnano')
        ]
    }
}
```
[From Webpack documentation](https://webpack.js.org/guides/production/):
Technically, *NODE_ENV* is a system environment variable that Node.js exposes into running scripts. It is used by convention to determine dev-vs-prod behavior by server tools, build scripts, and client-side libraries. Contrary to expectations, *process.env.NODE_ENV* **is not set to "production"** within the build script webpack.config.js. Thus, conditionals like `process.env.NODE_ENV === 'production' ? '[name].[hash].bundle.js' : '[name].bundle.js'` within webpack configurations do not work as expected.
