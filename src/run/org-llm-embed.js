// starts and maintains all under one process:
// 1. customer org llm server
// 2. customer org embed server

const { args, launch } = require('./common.js');

const app_id = args['app-id'] || 'rawh';

launch("rawh embed", "./src/app/embed.js", [ `--app-id=${app_id}` ]);
launch("rawh llm", "./src/app/llm.js", [
    `--app-id=${app_id}`,
    `--model=${args.model || "llama-2-7b-chat.Q2_K.gguf"}`, // todo update with "llama-3-7b-chat.Q2_k.gguf"
    args.context ? `--context=${args.context}` : '',
    args.batch ? `--batch=${args.batch}` : '',
    args.mmap ? `--mmap=${args.mmap}` : '',
    args.gpu ? `--gpu=${args.gpu}` : '',
].filter(a => a));