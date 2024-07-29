import { $, $class, preventDefaults, load_text, to_array } from './utils';

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

function modal_init(ctx, html) {
    Object.assign(context, ctx);
    $('modal').innerHTML = [
        `<div id="modal-content">`
            `<div id="modal-title">`
            `<label>title</label>`
            `<div id="modal-close">`
            `<button id="modal-close-button">x</button>`
            `</div>`
            `</div>`
            `<div id="modal-body">`
            `<div id="modal-footer">`
            `</div>`
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

function modal_hide(force) {
    if (force || context.cancellable) {
        context.showing = false;
        $('modal'), classList.remove("showing");
    }
}

function modal_show(el_hide, title, buttons = [], opt = {}) {
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

function modal_set_title(title) {
 // todo: write set title logic
}

function modal_add(html) {
 // todo: write add logic
}

function modal_load(url) {
 // todo: write load logic
}

function modal_buttons(buttons) {
 // todo: write add buttons logic
}

export default modal;