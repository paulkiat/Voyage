#ifndef UI_COMPONENT_H
#define UI_COMPONENT_H

#include "ui_context.h"
#include <functional>
#include <memory>
#include <string>
#include <vector>

class UIComponent {
public:
    virtual void draw(UIContext& context) = 0;
};

class Label : public UIComponent {
public:
    Label(const std::string& text);
    void draw(UIContext& context) override;
private:
    std::string text;
};

class Button : public UIComponent {
public:
    Button(int id, const std::string& text, std::function<void()> onClick);
    void draw(UIContext& context) override;
    bool DoButton(UIContext& context, int mouseX, int mouseY);
private:
    int id;
    int x, y, width, height;
    std::string text;
    std::function<void()> onClick;
    bool isHovered(int mouseX, int mouseY) const;
};

class TextEdit : public UIComponent {
public:
    TextEdit(const std::string& placeholder);
    void draw(UIContext& context) override;
private:
    std::string placeholder;
    std::string text;
};

class Checkbox : public UIComponent {
public:
    Checkbox(const std::string& label);
    void draw(UIContext& context) override;
private:
    std::string label;
    bool checked;
};

class RadioButton : public UIComponent {
public:
    RadioButton(const std::string& label);
    void draw(UIContext& context) override;
private:
    std::string label;
    bool selected;
};

class SelectableLabel : public UIComponent {
public:
    SelectableLabel(const std::string& label);
    void draw(UIContext& context) override;
private:
    std::string label;
    bool selected;
};

class ComboBox : public UIComponent {
public:
    ComboBox(const std::vector<std::string>& options);
    void draw(UIContext& context) override;
private:
    std::vector<std::string> options;
    int selectedIndex;
};

class Slider : public UIComponent {
public:
    Slider(int min, int max);
    void draw(UIContext& context) override;
private:
    int min;
    int max;
    int value;
};

class ProgressBar : public UIComponent {
public:
    ProgressBar(int value);
    void draw(UIContext& context) override;
private:
    int value;
};

class ColorPicker : public UIComponent {
public:
    ColorPicker();
    void draw(UIContext& context) override;
private:
    std::string color;
};

class Image : public UIComponent {
public:
    Image(const std::string& src);
    void draw(UIContext& context) override;
private:
    std::string src;
};

class PopUp : public UIComponent {
public:
    PopUp(const std::string& title, int x, int y, int width, int height);
    void addComponent(std::shared_ptr<UIComponent> component);
    void draw(UIContext& context) override;
private:
    std::string title;
    int x, y, width, height;
    std::vector<std::shared_ptr<UIComponent>> components;
};

#endif // UI_COMPONENT_H