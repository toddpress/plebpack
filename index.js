const fs = require('fs');
const path = require('path');
const { parse } = require('babylon');
const traverse = require('babel-traverse').default;
const babel = require('babel-core');
let ID = 0;

function createAsset(filename) {
	const content = fs.readFileSync(filename, 'utf-8');

	const ast = parse(content, {
		sourceType: 'module',
	});

	let dependencies = [];

	traverse(ast, {
		ImportDeclaration: ({ node }) => {
			dependencies.push(node.source.value);
		},
	});

	const id = ID++;
	const { code } = babel.transformFromAst(ast, null, {
		presets: ['env'],
	});

	return {
		id,
		filename,
		dependencies,
		code,
	};
}

function createGraph(entry) {
	const mainAsset = createAsset(entry);
	// dependency queue
	const queue = [mainAsset];

	// for main asset
	for (const asset of queue) {
		// get absolute path of asset directoru
		const dirname = path.dirname(asset.filename);
		// create mapping object for asset
		asset.mapping = {};
		// create "asset" from each dependency and add to queue
		asset.dependencies.forEach((relativePath) => {
			const absolutePath = path.join(dirname, relativePath);
			const child = createAsset(absolutePath);

			asset.mapping[relativePath] = child.id;
			queue.push(child);
		});
	}

	return queue;
}

function createBundle(graph) {
	let modules = `{
		${graph.reduce((acc, module) => {
			return (
				acc + `${module.id}: [
					function(require, module, exports) { 
						${module.code}
					},
					${ JSON.stringify(module.mapping) }
				],`
			);
		}, '')}
	}`;

	const result = `
	(function(modules) {
		function require(id) {
			const [fn, mapping] = modules[id];

			function localRequire(relativePath) {
				return require(mapping[relativePath])
			}

			const module = { exports: {} }

			fn(localRequire, module, module.exports);

			return module.exports;
		}
		require(0)
	})(${modules})`;
	return result;
}


module.exports = function bundle(entry) {
		const graph = createGraph(entry);
		return createBundle(graph);
}
