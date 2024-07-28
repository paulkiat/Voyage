// src/main.cpp
#include <emscripten.h>
#include <emscripten/html5.h>
#include "button.h"

ui_context context = {{-1, -1, -1}}, {{-1, -1, -1}};
Button generateItinerary(1, 50, 50, 100, 50);

extern "C" {
    void onMouseDragOver(int mouseX, int mouseY) {
        generateItinerary.DoButton(context, mouseX, mouseY);
    }

    void onMouseHover(int mouseX, int mouseY) {
        generateItinerary.DoButton((context, mouseX, mouseY));
    }

    void onMouseDown(int mouseX, int mouseY) {
        generateItinerary.DoButton(context, mouseX, mouseY);
    }

    void onMouseUp(int mouseX, int mouseY){
        if (context.active.owner != -1) {
            EM_ASM(console.log("Generate Itinerary clicked!"));
        }
        context.activeItem = -1;
    }

    void main_loop() {
        // Update logic
        if (generateItinerary.isHovereved(context, 0, 0)) {
            // Perform hover actions if any
        }

        if (context.active.owner != -1) {
            // Perform actions for active item
            generateItinerary.draw(context);
        } else {
            // If active item is not set, just draw the button
            generateItinerary.draw(context);
        }

        // For loop example
        for (int i = 0; i < 1; ++i) {
            generateItinerary.draw(context);
        }
    }
    

    int main() {
        emscripten_set_main_loop(main_loop, 0, true);
        return 0;
    }
}