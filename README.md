# minimal-ts-node-template

An opinionated Node.js project template using TypeScript,
with the goal of having zero runtime dependencies.

This template provides a solid foundation for generic backend services
without depending on any specific framework
such as queue workers or data pipelines.
It provides a solid starting point with common utilities
that are nice to have.

## Requirements

Only NodeJS version 22 or higher.

For adding support for older versions of node:

1. Run `npm i dotenv` in your terminal.
2. Add `import "dotenv/config";` at the top of your entry file (`src/app/index.ts` by default).
3. Change the "start" command inside of `package.json` into the following:
   `"start": "node ./dist/main.js"`.

> This process adds a runtime dependency, which goes against the goal of this project.
> Also, it is advised to check to see if you can update your runtime to version 22
> since this version is recommended for new projects.

To remove reliance on `process.env`
(for example, to make it compatible with browsers or alternative runtimes):

1. Modify the file `src/lib/logging/utils.ts`.
2. Adjust the `setupFromEnv` function to use your own environment-loading logic.

## Getting started

1. Create a project in github based on this template
   ([Tutorial by Github's docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template))
2. Change the project's details inside `package.json` to match your new project,
   focus on "name", "version", "description" and "repository".
3. Run `npm i` in the root folder.
4. (Optional) Run `cp ./.env.example ./.env`
   and modify its content as pleased.
   By default it has the default values for everything commented out.

### Important built-in commands

1. Development (hot-reload): `npm run dev`
2. Build partially optimized version (useful for testing and debugging
   since it mostly keeps the names): `npm run build`
3. Build for production: `npm run build:production`
4. Start project with optionally loaded `.env` file: `npm run start`
5. Start project without `.env` file loaded and `NODE_ENV` set to "production": `npm run start:production`

## What's included?

1. A minimal setup for TypeScript, ESLint, Prettier, and esbuild.
2. A production-ready logging library, included as source code for full customization.
3. A set of TypeScript type utilities.
4. Chunk-based utilities for working with large data operations efficiently.
5. A collection of promise utilities, including an error-as-value wrapper
   and a named-key version of Promise.allSettled.
6. Optimized ready to use Dockerfile.
