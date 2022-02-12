# TS-ESBUILD-TEMPLATE

Simple and minimal Typescript + ESBuild template

### Installation

#### Using github template

You can create your new project in github.com, using github's template feature.

#### Git clone

```sh
git clone https://github.com/olimot/ts-esbuild-template.git my-project
cd my-project
rm -rf .git
npm install # or any package manager you use
```

Note: You can use any package manager you want. If so, you should change `npm` commands used in scripts at `package.json` to the package manager commands you will use.

### Adding react

Add react, react-dom, and typing packages

```sh
yarn add @types/react react @types/react-dom react-dom
```

add jsx property in `"compilerOptions"` at `tsconfig.json`.

```json
{
  "compilerOptions": {
    "jsx": "react"
  }
}
```

Rename `main.ts` to `main.tsx`, and also change the file in the build script at `package.json`.

```json
{
  "scripts": {
    "build": "esbuild --bundle src/main.tsx --outfile=www/main.js"
  }
}
```

Optionally, add tsx and jsx in .gitattributes file.

```ini
*.tsx  text eol=lf
*.jsx  text eol=lf
```
