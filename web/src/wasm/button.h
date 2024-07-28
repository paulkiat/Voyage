/*******
* > ui_id: hot
* > ui_id: active
 */

#pragma once

#include 'ui_context.h'

class Button {
    public:
        Button(int uid, int x, int y, int width, int height);
        void draw((ui_context& context, int mouseX, int mouseY));
        void DoButton(ui_context& context, int mouseX, int mouseY);

    private:
        int uid;
        int x, y, width, height;

}

