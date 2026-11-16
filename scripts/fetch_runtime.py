#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补齐鲸鲸信箱的本地运行环境（模型 + llama.cpp Windows CPU 二进制）。

用法：
    python scripts/fetch_runtime.py
只下载缺失的部分。模型约 2.33 GiB，二进制包约 24 MiB。
"""
import os
import sys
import zipfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNTIME = os.path.join(ROOT, 'lib', 'runtime')
LLAMA_DIR = os.path.join(RUNTIME, 'llama')
MODEL = os.path.join(RUNTIME, 'Qwen3-4B-Q4_K_M.gguf')
MODEL_URLS = [
    'https://hf-mirror.com/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf',
    'https://www.modelscope.cn/models/Qwen/Qwen3-4B-GGUF/resolve/master/Qwen3-4B-Q4_K_M.gguf',
]
MODEL_MIN = 2_400_000_000
LLAMA_ZIP = os.path.join(RUNTIME, '_llama_win.zip')
LLAMA_URLS = [
    'https://gh-proxy.com/https://github.com/ggml-org/llama.cpp/releases/download/b12394/llama-b12394-bin-win-cpu-x64.zip',
    'https://github.com/ggml-org/llama.cpp/releases/download/b12394/llama-b12394-bin-win-cpu-x64.zip',
]


def fetch(url, dest, label):
    print('[下载] ' + label + '\n  ' + url)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest + '.part', 'wb') as f:
        total = int(r.headers.get('Content-Length') or 0)
        done = 0
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total:
                print('\r  %d / %d MB' % (done // 1048576, total // 1048576), end='', flush=True)
    print()
    os.replace(dest + '.part', dest)
    return os.path.getsize(dest)


def need_model():
    return not (os.path.isfile(MODEL) and os.path.getsize(MODEL) >= MODEL_MIN)


def need_llama():
    exe = os.path.join(LLAMA_DIR, 'llama-server.exe')
    if not os.path.isfile(exe):
        return True
    return not any(n.lower().endswith('.dll') for n in os.listdir(LLAMA_DIR))


def main():
    os.makedirs(RUNTIME, exist_ok=True)
    if need_model():
        for url in MODEL_URLS:
            try:
                size = fetch(url, MODEL, 'Qwen3-4B-Q4_K_M.gguf')
                if size >= MODEL_MIN:
                    break
            except Exception as e:
                print('  失败：%s' % e)
        else:
            print('[错误] 模型下载失败，可手动放置到 ' + MODEL)
            return 1
    else:
        print('[跳过] 模型已存在：%.2f GiB' % (os.path.getsize(MODEL) / 1073741824))

    if need_llama():
        for url in LLAMA_URLS:
            try:
                fetch(url, LLAMA_ZIP, 'llama.cpp Windows CPU x64')
                break
            except Exception as e:
                print('  失败：%s' % e)
        else:
            print('[错误] llama.cpp 下载失败。可把本机 Ollama 安装目录 lib/ollama 下的 '
                  'llama-server.exe 与所有 .dll 手动复制到 ' + LLAMA_DIR)
            return 1
        os.makedirs(LLAMA_DIR, exist_ok=True)
        with zipfile.ZipFile(LLAMA_ZIP) as z:
            for name in z.namelist():
                base = os.path.basename(name)
                if base.lower().endswith(('.exe', '.dll')):
                    with z.open(name) as src, open(os.path.join(LLAMA_DIR, base), 'wb') as dst:
                        dst.write(src.read())
        os.remove(LLAMA_ZIP)
        print('[完成] llama.cpp 已展开到 ' + LLAMA_DIR)
    else:
        print('[跳过] llama.cpp 已存在')

    print('[就绪] 本地运行环境齐全。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
