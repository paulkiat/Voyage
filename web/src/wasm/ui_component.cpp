#include "ui_component.h"
#include <emscripten.h>
#include <iostream>

Label::Label(const std::string& text) : text(text) {}
void Label::draw(UIContext& context) {
    EM_ASM({
        var text = UTF8ToString($0);
        var label = document.createElement('div');
        label.innerText = text;
        label.classList.add('widget-label');
        document.getElementById('popup-content').appendChild(label);
    }, text.c_str());
}

Button::Button(int id, const std::string& text, std::function<void()> onClick)
    : id(id), text(text), onClick(onClick) {}
void Button::draw(UIContext& context) {
    EM_ASM({
        var id = $0;
        var text = UTF8ToString($1);
        var button = document.createElement('button');
        button.innerText = text;
        button.id = 'button' + id;
        button.classList.add('widget-button');
        button.onclick = function() {
            Module.ccall('buttonClicked', 'void', ['number'], [id]);
        };
        document.getElementById('popup-content').appendChild(button);
    }, id, text.c_str());
}

bool Button::DoButton(UIContext& context, int mouseX, int mouseY) {
    bool result = false;
    if (context.active.owner == id) {
        if (!EM_ASM_INT_V({ return Module.mouseDown; })) {
            if (context.hot.owner == id) {
                result = true;
            }
            context.active.owner = -1; 
        }
    } else if (context.hot.owner == id) {
        if (EM_ASM_INT_V({ return Module.mouseDown; })) {
            context.active.owner = id; 
        }
    }
    if (isHovered(mouseX, mouseY)) {
        context.hot.owner = id; 
    } else {
        if (context.hot.owner == id) {
            context.hot.owner = -1;
        }
    }
    return result;
}

bool Button::isHovered(int mouseX, int mouseY) const {
    return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
}

TextEdit::TextEdit(const std::string& placeholder) : placeholder(placeholder) {}
void TextEdit::draw(UIContext& context) {
    EM_ASM({
        var placeholder = UTF8ToString($0);
        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.classList.add('widget-textedit');
        document.getElementById('popup-content').appendChild(input);
    }, placeholder.c_str());
}

Checkbox::Checkbox(const std::string& label) : label(label), checked(false) {}
void Checkbox::draw(UIContext& context) {
    EM_ASM({
        var label = UTF8ToString($0);
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('widget-checkbox');
        var checkboxLabel = document.createElement('label');
        checkboxLabel.innerText = label;
        document.getElementById('popup-content').appendChild(checkboxLabel);
        document.getElementById('popup-content').appendChild(checkbox);
    }, label.c_str());
}

RadioButton::RadioButton(const std::string& label) : label(label), selected(false) {}
void RadioButton::draw(UIContext& context) {
    EM_ASM({
        var label = UTF8ToString($0);
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'radio-group';
        radio.classList.add('widget-radiobutton');
        var radioLabel = document.createElement('label');
        radioLabel.innerText = label;
        document.getElementById('popup-content').appendChild(radioLabel);
        document.getElementById('popup-content').appendChild(radio);
    }, label.c_str());
}

SelectableLabel::SelectableLabel(const std::string& label) : label(label), selected(false) {}
void SelectableLabel::draw(UIContext& context) {
    EM_ASM({
        var label = UTF8ToString($0);
        var div = document.createElement('div');
        div.innerText = label;
        div.classList.add('widget-selectablelabel');
        div.onclick = function() {
            div.classList.toggle('selected');
        };
        document.getElementById('popup-content').appendChild(div);
    }, label.c_str());
}

ComboBox::ComboBox(const std::vector<std::string>& options) : options(options), selectedIndex(0) {}
void ComboBox::draw(UIContext& context) {
    EM_ASM({
        var options = [];
        for (var i = 0; i < $0; i++) {
            options.push(UTF8ToString(HEAPU32[$1 + i * 4 >> 2]));
        }
        var select = document.createElement('select');
        options.forEach(function(option) {
            var opt = document.createElement('option');
            opt.value = option;
            opt.innerText = option;
            select.appendChild(opt);
        });
        select.classList.add('widget-combobox');
        document.getElementById('popup-content').appendChild(select);
    }, options.size(), options.data());
}

Slider::Slider(int min, int max) : min(min), max(max), value((max - min) / 2) {}
void Slider::draw(UIContext& context)

Slider::draw(UIContext& context) {
    EM_ASM({
        var min = $0;
        var max = $1;
        var value = $2;
        var input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = value;
        input.classList.add('widget-slider');
        document.getElementById('popup-content').appendChild(input);
    }, min, max, value);
}

ProgressBar::ProgressBar(int value) : value(value) {}
void ProgressBar::draw(UIContext& context) {
    EM_ASM({
        var value = $0;
        var div = document.createElement('div');
        var progress = document.createElement('div');
        div.classList.add('widget-progressbar-container');
        progress.classList.add('widget-progressbar');
        progress.style.width = value + '%';
        div.appendChild(progress);
        document.getElementById('popup-content').appendChild(div);
    }, value);
}

ColorPicker::ColorPicker() : color("#000000") {}
void ColorPicker::draw(UIContext& context) {
    EM_ASM({
        var input = document.createElement('input');
        input.type = 'color';
        input.value = UTF8ToString($0);
        input.classList.add('widget-colorpicker');
        document.getElementById('popup-content').appendChild(input);
    }, color.c_str());
}

Image::Image(const std::string& src) : src(src) {}
void Image::draw(UIContext& context) {
    EM_ASM({
        var src = UTF8ToString($0);
        var img = document.createElement('img');
        img.src = src;
        img.classList.add('widget-image');
        document.getElementById('popup-content').appendChild(img);
    }, src.c_str());
}

PopUp::PopUp(const std::string& title, int x, int y, int width, int height)
    : title(title), x(x), y(y), width(width), height(height) {}

void PopUp::addComponent(std::shared_ptr<UIComponent> component) {
    components.push_back(component);
}

void PopUp::draw(UIContext& context) {
    EM_ASM({
        var title = UTF8ToString($0);
        var x = $1;
        var y = $2;
        var width = $3;
        var height = $4;

        var popup = document.createElement('div');
        popup.id = 'popup';
        popup.style.position = 'absolute';
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.width = width + 'px';
        popup.style.height = height + 'px';
        popup.style.backgroundColor = '#333';
        popup.style.border = '1px solid #555';
        popup.style.padding = '10px';
        popup.style.zIndex = '1000';

        var popupTitle = document.createElement('div');
        popupTitle.innerText = title;
        popupTitle.style.fontSize = '18px';
        popupTitle.style.fontWeight = 'bold';
        popupTitle.style.color = '#fff';
        popup.appendChild(popupTitle);

        var popupContent = document.createElement('div');
        popupContent.id = 'popup-content';
        popupContent.style.marginTop = '10px';
        popup.appendChild(popupContent);

        document.body.appendChild(popup);
    }, title.c_str(), x, y, width, height);

    for (auto& component : components) {
        component->draw(context);
    }
}