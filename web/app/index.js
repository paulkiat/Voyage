import session from "./lib/session.js";
import setup_file_drop from "./lib/file-drop.js";
import { ws_proxy_api } from "./lib/ws-net.js";
import { $, LS, on_key, uid, tab_showing, loadHighlightingCSS, base64ArrayBuffer } from "./lib/utils.js";

const { markedHighlight } = globalThis.markedHighlight;
const marker = window.marker = new marked.Marked(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang, info) {
            lang = lang || "javascript";
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    })
);

loadHighlightingCSS();

const session_uid = location.hash ? location.hash.slice(1) : undefined;

const state = {
    topic_embed: "llm-query/org",
    topic_chat: "llm-ssn-query/org",
    api: undefined, // set in on_load()
    embed: false,
    // max_tokens: 4096,
    // min_match: 0.75,
    // max_tokens: 8192,
    // min_match: 0.5,
};

function update_file_list() {
    state.api.call("doc-list/$", {}, (msg) => {
        if (!Array.isArray(msg)) {
            return;
        }
        const html = [
            '<div class="head">',
            '<label></label><label>file</label>',
            '</div>'
        ];
        for (let rec of msg) {
            const { uid, name, type, state, added, chunks, length } = rec[1];
            const title = [
                `chunks: ${chunks}`,
                `length: ${length}`,
                `added: ${dayjs(added).format('YYYY/MM/DD')}`
            ].join("\n");
            html.push([
                '<div class="data">',
                `<label class="actions">`,
                `<button onclick="doc_delete('${uid}')")>X</button>`,
                `</label>`,
                `<label title="${title}">${name}</label>`,
                '</div>'
            ].join(''));
        }
        $('file-list').innerHTML = html.join('');
    });
}

function doc_delete(uid) {
    state.api.call("doc-delete/$", {uid}, (msg) => {
        console.log({ doc_delete: msg });
        update_file_list();
    });
}

function setup_session() {
    setup_subscriptions();
    session.init(state.api, session_dead, session_uid);
    setTimeout(() => {
        $('username').value = session.username;
    }, 100);
}

function session_dead(error) {
    console.log({ DEAD_SESSION: error });
    setTimeout(() => {
        window.location = "/";
    }, 2000);
}

function setup_subscriptions() {
    state.api.subscribe("doc-loading/$", msg => {
        if (msg.state === 'ready') {
            update_file_list();
        }
    });
    state.api.subscribe("doc-delete/$", msg => {
        update_file_list();
    });
    setup_llm_session();
}

function setup_llm_session() {
    state.api.call("llm-ssn-start/org", {}, (msg, error) => {
        if (msg && msg.sid) {
            console.log({ llm_session: msg.sid });
            state.llm_ssn = msg.sid;
            enable_query();
            state.llmHB = setInterval(() => {
                if (state.lastHB && Date.now() - state.lastHB > 15000 && tab_showing()) {
                    console.log("TAB WAS PUT TO SLEEP. LLM STATE LOST. RECONNECTING");
                    clearTimeout(state.llmHB);
                    state.lastHB = undefined;
                    return setup_llm_session();
                }
                state.api.publish(`~${msg.sid}`, { sid: msg.sid });
                state.lastHB = Date.now();
            }, 5000);
        } else {
            console.log({ llm_session_error: error, msg });
        }
    });
}

function set_answer(text, query) {
    if (text !== undefined && state.output) {
        try {
            state.output.innerHTML = marker.parse(text);
        } catch (error) {
            state.output.innerText = text;
            console.log({ error, text });
        }
        const hrwap = $('hwrap');
        hrwap.scrollTop = hrwap.scrollHeight;
    }
    if (query !== undefined) $('query').value = query;
    $('query').focus();
}

function append_history(label, text, clazz) {
    const elid = uid();
    const hlog = $('hlog');
    const hrwap = $('hwrap');
    hlog.innerHTML += [
        `<div class="label ${clazz}">${label}</div>`,
        `<div id="${elid}" class="text ${clazz}">${text}</div>`,
    ].join('');
    hrwap.scrollTop = hrwap.scrollHeight;
    state.output = $(elid);
    return elid;
}

function query_llm(query, then, disable = true) {
    console.log({ query });
    if (disable) {
        disable_query();
    }
    then = then || set_answer;
    const start = Date.now();
    const rand = Math.round(Math.random() * 0xffffffff).toString(36);
    const topic = `~${start.toString(36)}:${rand}`;
    const tokens = [];
    state.api.subscribe(topic, (token) => {
        tokens.push(token);
        set_answer(tokens.join(''));
    }, 120);
    append_history("", query, "you");
    append_history("AI", "thinking...", "ai");
    if (state.embed) {
        query_embed(query, topic, start, then);
    } else {
        query_chat(query, topic, start, then);
    }
}

function query_chat(query, topic, start, then) {
    state.api.call(state.topic_chat, {
        sid: state.llm_ssn,
        query,
        topic,
    }, msg => {
        if (msg) {
            console.log({ answer: msg.answer, time: Date.now() - start });
            then(msg.answer);
            enable_query();
        } else {
            console.log({ llm_said: msg });
            then("there was an error processing this query");
        }
    });
}

function query_embed(query, topic, start, then) {
    state.api.call("docs-query/$", {
        query,
        topic,
        llm: state.topic_embed,
        min_match: state.min_match,
        max_tokens: state.max_tokens,
    }, msg => {
        if (msg && msg.answer) {
            console.log({ answer: msg.answer, pages: msg.pages, time: Date.now() - start });
            then(msg.answer);
            enable_query();
        } else {
            console.log(msg);
            window.answer = msg;
        }
    });
}

function setup_qna_bindings() {
    disable_query();
    const query = $('query');
    on_key('Enter', query, () => {
        query_llm(query.value);
        LS.set('last-query', query.value);
    });
    $('mode-chat').onclick = () => {
        LS.set('last-mode', 'chat');
        state.embed = false;
        $('mode-chat').classList.add('selected');
        $('mode-embed').classList.remove('selected');
    };
    $('mode-embed').onclick = () => {
        LS.set('last-mode', 'embed');
        state.embed = true;
        $('mode-chat').classList.remove('selected');
        $('mode-embed').classList.add('selected');
    };
    if (LS.get('last-mode') === 'embed') {
        $('mode-embed').onclick();
    } else {
        $('mode-chat').onclick();
    }
}

function disable_query() {
    $('query').disabled = true;
}

function enable_query() {
    $('query').disabled = false;
    $('query').focus();
}

async function on_load() {
    const api = state.api = window.api = (state.api || await ws_proxy_api());
    api.on_ready(setup_session);
    setup_file_drop('assets', 'file-select', { uploadFn: (file, type) => {
        console.log(`[uploading] (${type})`, file.name);
        console.log({ upload: file, type });
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = base64ArrayBuffer(event.target.result);
            api.call('doc-load/$', { data, type, name: file.name }, reply => {
                console.log({ reply });
            });
        };
        reader.readAsArrayBuffer(file);
    }});
    setup_qna_bindings();
    await getDocs();
    update_file_list();
    update_group_list();
    $('query').value = LS.get('last-query') || '';
    marked.setOptions({
        highlight: function(code, lang) {
            console.log({ highlight: code, lang });
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });

    setup_event_listeners();
}

document.addEventListener('DOMContentLoaded', on_load);
window.update_file_list = update_file_list;
window.update_group_list = update_group_list;
window.doc_sel_delete = doc_sel_delete;
window.doc_delete = doc_delete;
window.doc_group_new = doc_group_new;
window.doc_group_add = doc_group_add;
window.doc_group_rem = doc_group_rem;
window.doc_group_del = doc_group_del;
window.add_sel_docs = add_sel_docs;
window.group_sel = group_sel;
window.deleteGroup = deleteGroup;
window.doc_group_add_batch = doc_group_add_batch;
window.create_new_group = create_new_group;

function setup_event_listeners() {
  const open_dropdown = $("file-group-list");
  const delete_group_btn = $("doc-group-delete");
  const delete_btn = $("deleteFilesButton");
  const submit_btn = $("group-new-button");
  const cancel_btn = $("group-cancel-button");
  const create_group_btn = $("createGroupButton");
  const rename_group_btn = $("rename-group-button");
  const modal = $("modal");

  if (create_group_btn) {
    create_group_btn.onclick = () => { 
      modal.style.display = "block";
    };
  }
  if (delete_btn) {
      delete_btn.onclick = () => { doc_sel_delete(); };
  }
  if (delete_group_btn) {
      delete_group_btn.onclick = () => { deleteSelectedGroup(); };
  }
  if (open_dropdown) {
      open_dropdown.onclick = toggleDropdown;
  }
  if (cancel_btn) {
      cancel_btn.onclick = () => { modal.style.display = "none"; };
  }
  if (submit_btn) {
    submit_btn.onclick = () => {
      const groupName = $('edit-group-name').value;
      if (!groupName) {
        alert("Group name cannot be empty");
        return;
      }
      add_sel_docs(null, true, groupName);
      modal.style.display = "none";
    };
  }
  if (rename_group_btn) {
    rename_group_btn.onclick = () => {
      const newName = $('rename-group-name').value;
      const selectedGroupId = document.getElementById('dropdown-label').dataset.id;
      rename_group(selectedGroupId, newName);
    }
  }

  window.onclick = event => { 
      if (event.target == modal) {
          modal.style.display = "none"; 
      }
  };
}