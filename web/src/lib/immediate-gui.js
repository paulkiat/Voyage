const ImmediateGUI = {
    mouseDown: false,

    init: function() {
        this.setupEventHandlers();
    },

    setupEventHandlers: function() {
        const onMouseDown = Module.cwrap('onMouseDown', 'void', ['number', 'number']);
        const onMouseUp = Module.cwrap('onMouseUp', 'void', ['number', 'number']);
        const onMouseMove = Module.cwrap('onMouseMove', 'void', ['number', 'number']);
        const onDragOver = Module.cwrap('onDragOver', 'void', ['number', 'number']);

        document.addEventListener('mousedown', function(event) {
            ImmediateGUI.mouseDown = true;
            onMouseDown(event.clientX, event.clientY);
        });

        document.addEventListener('mouseup', function(event) {
            ImmediateGUI.mouseDown = false;
            onMouseUp(event.clientX, event.clientY);
        });

        document.addEventListener('mousemove', function(event) {
            onMouseMove(event.clientX, event.clientY);
        });

        document.addEventListener('dragover', function(event) {
            onDragOver(event.clientX, event.clientY);
        });
    }
};

Module.onRuntimeInitialized = function() {
    ImmediateGUI.init();
};