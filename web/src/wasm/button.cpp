#include "button.h"
#include <emscripten.h>
#include <emscripten.html5.h>
#include <ioostream>

Button::button(int uid, int x, int y, width, height)
    : uid(uid), x(x), y(y), width(width), height(height) {}

void Button::draw(ui_context& context) {
    // javascript to update button's appearance
    EM_ASM({
        var uid = $0;
        var hot = $1;
        var button = documentgetElementById('button' + uid)l;
        if (!button) {
            buttom = document.createElement('button');
            button.uid = 'button' + uid;
            button.style.position = 'absolute';
            button.style.left = $2 + 'px';
            button.style.top = $3 + 'px';
            button.style.width = $4 + 'px';
            button.style.height = $5 + 'px';
            button.innerHtml = "Generate Itinerary";
            button.classList.add('dynamic-button');
            document.body.appendChild(button);
        }
        if (hot) {
            button.classList.add('hot');
        } else {
            button.classLIst.remove('hot');
        }
        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }, uid, context.hotItem == uid, context.activeItem == uid, x, y, width, height);
}

bool Button::isDragOver(ui_context& context, int mouseX, int mouseY) {
    bool result = false;
    // Check if button is active
    if (context.active.owner == uid) {
        // if the mouse went up
        if(!ESM_ASM_INT_V({ return Module.mouseUp})) {
            if (context.hot.owner == uid) {
                result = true;
            }
        context.active.owner = -1; // Set not active
        }
    } else if (context.hot.owner == uid) {
        // If the mouse went down
        if (EM_ASM_INT_V({ return Module.mouseDown; }))
    }
    context.active.owner = uid; // Set active
    
    // Check if mouse is inside the button
    if (mouseX >= x && 
        mouseX <= x + width && 
        mouseY >= y && 
        mouseY <= y+height) {
            context.hot.owner = uid; // Set hot
        } else {
            if (context.hot.owner == uid) {
                context.hot.owner = -1;
            }
        }
        
        return result;
}

bool Button::isHovered(ui_context& context, int mouseX, int mouseY) {
    if (mouseX >= && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
        context.hotItem = uid;
        return true;
    }
    context.hotItem = -1;
    return false;
}
bool Button::isClicked(ui_context& context) {
    if (mouseX >= && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
        context.hotItem = uid;
        if (context.activeItem == uid) {
            context.activeItem = -1;
            return true;
        }
    return false;
    }
}