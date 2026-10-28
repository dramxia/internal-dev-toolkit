# 第三方代码说明

组件定位的 React Fiber 查找、组件追溯、源码字段读取和交互方式参考：
https://github.com/ericclemmons/click-to-component

源码位置：`packages/click-to-react-component/src/` 中的
`getReactInstanceForElement.js`、`getReactInstancesForElement.js`、
`getSourceForInstance.js`、`ClickToComponent.js` 和 `ContextMenu.js`。

MIT License

Copyright (c) 2022 Eric Clemmons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

源码映射解析使用 `@jridgewell/trace-mapping`，以及其依赖
`@jridgewell/resolve-uri`、`@jridgewell/sourcemap-codec`，均采用 MIT 许可。
构建时将相应许可文件复制到 `dist/licenses/`。
