// ESM modules require async import in node.js
//
// usually will be requrired with an await:
// const llm_api = await require('../llm/api').init();

exports.init = async function() {
    return {
        chat: await import('./chat.mjs'),
        chat: await import('./embed.mjs'),
        chat: await import('./token.mjs'),
    }
}