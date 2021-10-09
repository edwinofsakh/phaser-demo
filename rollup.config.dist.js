import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import babel from "@rollup/plugin-babel";
import typescript from '@rollup/plugin-typescript';
import progress from 'rollup-plugin-progress';
import { uglify } from 'rollup-plugin-uglify';

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
        sourcemap: false,
        intro: 'var global = window;'
    },

    plugins: [
        progress(),

        //  Toggle the booleans here to enable / disable Phaser 3 features:
        replace({
            preventAssignment: true,
            'typeof CANVAS_RENDERER': JSON.stringify(true),
            'typeof WEBGL_RENDERER': JSON.stringify(true),
            'typeof EXPERIMENTAL': JSON.stringify(true),
            'typeof PLUGIN_CAMERA3D': JSON.stringify(false),
            'typeof PLUGIN_FBINSTANT': JSON.stringify(false),
            'typeof FEATURE_SOUND': JSON.stringify(true)
        }),

        //  Parse our .ts source files
        nodeResolve({
            browser: true,
            // extensions: [ '.ts', '.tsx' ]
        }),

        //  We need to convert the Phaser 3 CJS modules into a format Rollup can use:
        commonjs(),
        // commonjs({
        //     include: [
        //         'node_modules/eventemitter3/**',
        //         'node_modules/phaser/**',
        //         'node_modules/parseuri/**',
        //         'node_modules/backo2/**',
        //         'node_modules/engine.io/lib/**',
        //         'node_modules/engine.io-client/**',
        //         'node_modules/socket.io-client/**',
        //     ],
        //     exclude: [ 
        //         'node_modules/phaser/src/polyfills/requestAnimationFrame.js'
        //     ],
        //     sourceMap: false,
        //     ignoreGlobal: true
        // }),

        babel({
            include: ["**.js", "node_modules/**"],
            exclude: ["node_modules/phaser/dist/phaser.js"],
            babelHelpers: "bundled",
            presets: ["@babel/preset-env"],
          }),
        
          //  See https://www.npmjs.com/package/rollup-plugin-typescript2 for config options
        typescript(),

        //  See https://www.npmjs.com/package/rollup-plugin-uglify for config options
        uglify({
            mangle: false
        })

    ]
};