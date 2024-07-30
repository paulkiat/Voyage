// modal.js
// Manages modal windows for the AI Travel Companion application

import { $, $class, preventDefaults, load_text, to_array } from './utils.js';

const context = {};

const modal = {
    init: modal_init,
    show: modal_show,
    hide: modal_hide,
    set_title: modal_set_title,
    load: modal_load,
    add: modal_add,
    get showing() { return context.showing ? true : false }
};

/**
 * Initializes the modal with the given context and optional HTML.
 * @param {Object} ctx - Context object.
 * @param {string|Array} html - Optional HTML content.
 */
function modal_init(ctx, html) {
    Object.assign(context, ctx);
    $('modal').innerHTML = [
        '<div id="modal-content">',
        '<div id="modal-title">',
        '<label>title</label>',
        '<div id="modal-close">',
        '<button id="modal-close-button">x</button>',
        '</div>',
        '</div>',
        '<div id="modal-body"></div>',
        '<div id="modal-footer"></div>',
        '</div>'
    ].join('');
    $('modal-close-button').onclick = modal_hide;
    document.onkeydown = ev => {
        if (context.showing && ev.code === 'Escape') {
            modal_hide();
            preventDefaults(ev);
        }
    };
    if (html) {
        if (Array.isArray(html)) {
            modal_add(html);
        } else {
            return modal_load(html);
        }
    }
}

/**
 * Hides the modal, optionally forcing the hide.
 * @param {boolean} [force] - Force hide the modal.
 */
function modal_hide(force) {
    if (force || context.cancellable) {
        context.showing = false;
        $('modal').classList.remove("showing");
    }
}

/**
 * Shows the modal with the given element ID, title, and buttons.
 * @param {string|Array} el_id - Element ID(s) to show.
 * @param {string} title - Title of the modal.
 * @param {Array} [buttons=[]] - Buttons for the modal.
 * @param {Object} [opt={}] - Optional parameters.
 * @returns {Object} - Button elements.
 */
function modal_show(el_id, title, buttons = [], opt = {}) {
    context.showing = true;
    const cc = context.cancellable = opt.cancellable !== false;
    $('modal-close-button').style.display = cc ? '' : 'none';
    $class('content').forEach(el => {
        el.classList.add("hidden");
    });
    to_array(el_id).forEach(el_id => {
        $(el_id).classList.remove("hidden");
    });
    modal_set_title(title);
    $('modal').classList.add("showing");
    return modal_buttons(buttons);
}

/**
 * Sets the title of the modal.
 * @param {string} title - Title to set.
 */
function modal_set_title(title) {
    $('modal-title').children[0].innerText = title;
}

/**
 * Adds HTML content to the modal body.
 * @param {string|Array} html - HTML content to add.
 */
function modal_add(html) {
    html = (Array.isArray(html) ? html : [html]).join('');
    $('modal-body').innerHTML += html;
}

/**
 * Loads HTML content from a URL into the modal body.
 * @param {string} url - URL to load HTML from.
 * @returns {Promise} - Promise resolving when HTML is loaded.
 */
function modal_load(url) {
    return load_text(url).then(html => modal_add(html));
}

/**
 * Creates buttons for the modal footer.
 * @param {Object} buttons - Button definitions.
 * @returns {Object} - Button elements.
 */
function modal_buttons(buttons) {
    const list = Object.keys(buttons);
    const fns = Object.values(buttons);
    const btns = {};
    $('modal-footer').innerHTML = list.map((button, idx) => {
        return `<button id="mb-${idx}">${button}</button>`;
    }).join('');
    fns.forEach((fn, idx) => {
        const btn = $(`mb-${idx}`);
        btns[list[idx]] = btn;
        btn.onclick = () => {
            const res = (fn && fn(list[idx]));
            if (res !== false) {
                modal_hide();
            }
        };
    });
    return btns;
}

export default modal;