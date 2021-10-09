import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import babel from "@rollup/plugin-babel";
import serve from 'rollup-plugin-serve';
import typescript from '@rollup/plugin-typescript';
import progress from 'rollup-plugin-progress';

export default {

    //  Our games entry point (edit as required)
    input: [
        './src/game.ts'
    ],

    //  Where the build file is to be generated.
    //  Most games being built for distribution can use iife as the module type.
    //  You can also use 'umd' if you need to ingest your game into another system.
    //  The 'intro' property can be removed if using Phaser 3.21 or above. Keep it for earlier versions.
    output: {
        file: './dist/game.js',
        name: 'MyGame',
        format: 'iife',
        sourcemap: true,
        intro: 'var global = window;'
    },

    plugins: [
        // See https://www.npmjs.com/package/rollup-plugin-progress for config options
        progress(),

        // See https://www.npmjs.com/package/@rollup/plugin-replace for config options
        replace({
            preventAssignment: true,
            // Toggle the booleans here to enable / disable Phaser 3 features:
            'typeof CANVAS_RENDERER': JSON.stringify(true),
            'typeof WEBGL_RENDERER': JSON.stringify(true),
            'typeof EXPERIMENTAL': JSON.stringify(true),
            'typeof PLUGIN_CAMERA3D': JSON.stringify(false),
            'typeof PLUGIN_FBINSTANT': JSON.stringify(false),
            'typeof FEATURE_SOUND': JSON.stringify(true)
        }),

        // See https://www.npmjs.com/package/@rollup/plugin-node-resolve for config options
        resolve({
            browser: true,
            // extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx' ]
            // extensions: ['.ts', '.tsx' ]
        }),

        // See https://www.npmjs.com/package/@rollup/plugin-commonjs for config options
        commonjs(),
        
        // See https://www.npmjs.com/package/@rollup/plugin-babel for config options
        babel({
            include: ["**.js", "node_modules/**"],
            // Exclude Phaser due to it is too big
            exclude: ["node_modules/phaser/dist/phaser.js"],
            babelHelpers: "bundled",
            presets: ["@babel/preset-env"],
        }),

        //  See https://www.npmjs.com/package/@rollup/plugin-typescript for config options
        typescript(),

        //  See https://www.npmjs.com/package/rollup-plugin-serve for config options
        serve({
            open: true,
            contentBase: 'dist',
            host: 'localhost',
            port: 10001,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        })

    ]
};