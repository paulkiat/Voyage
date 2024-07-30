// starts and maintains all under one process:
// 1. Rawh hub server
// 2. customer org proxy + broker server
// 3. customer org llm server (optional)
// 4. customer org embed server (optional)
// 5. customer app web server "test"
// 6. customer app doc server "test"

const { args, launch } = require('./common.js');

const org_id = args['org-id'] || "test";
const app_id = args['app-id'] || "test";

launch("hub", "./src/hub/main.js", ["--default-org", `--org-id=${org_id}`]);
launch("org", "./src/org/main.js", [`--org-id=${org_id}`, `--app-id=${app_id}`, "--test-app"]);
launch(`app web test`, "./src/app/web.js", [`--app-id=${app_id}`, '--app-port=0']);
launch(`app doc test`, "./src/app/doc.js", [`--app-id=${app_id}`]);
launch(`app store test`, "./src/app/store.js", [`--app-id=${app_id}`]);

if (args.llm) {
    launch("org embed", "./src/app/embed.js", ["--app-id=org"]);
    launch("org llm", "./src/app/llm.js", [
        "--app-id=org",
        `--model=${args.model || "llama-2-7b-chat.Q2_K.gguf"}`, // todo update with "llama-3-7b-chat.Q2_k.gguf"
        args.context ? `--context=${args.context}` : '',
        args.batch ? `--batch=${args.batch}` : '',
        args.mmap ? `--mmap=${args.mmap}` : '',
        args.gpu ? `--gpu=${args.gpu}` : ''
    ].filter(a => a));
}