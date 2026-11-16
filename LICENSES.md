# 第三方组件与许可

本插件把运行环境一起打包，包含以下第三方组件。各自版权归原作者所有。

| 组件 | 用途 | 许可 | 随包位置 |
| --- | --- | --- | --- |
| Qwen3-4B-Q4_K_M.gguf | 本地 4B 语言模型，生成回信 | Apache-2.0（Qwen） | `lib/runtime/` |
| llama.cpp Windows CPU x64 二进制 | 本地推理服务 | MIT（llama.cpp） | `lib/runtime/llama/` |
| LongCang-Regular.ttf | 正文手写行书字体（龙藏体） | SIL Open Font License 1.1 | `lib/assets/`，完整许可证见 `OFL-LongCang.txt` |
| MaShanZheng-Regular.ttf | 落款与信封毛笔字 | SIL Open Font License 1.1 | `lib/assets/`，完整许可证见 `OFL-MaShanZheng.txt` |
| 打包的运行时库（ggml / libllama / libc++ 等 .dll） | 推理依赖 | 随 llama.cpp / LLVM 各自许可 | `lib/runtime/llama/*_LICENSE*` |

二进制取自本机已安装的 Ollama 发行包中的 CPU 版 runner（llama.cpp 派生），
已去掉 CUDA 子目录；安装到用户机器后**不需要** Ollama、Python、Node 之外的任何软件，
运行期不访问网络。

插件自身代码：MIT。
