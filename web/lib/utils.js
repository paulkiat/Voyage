/*$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
* $ Usage for Each Function
 
  1. Array Actions:
    •	array_once: Ensures a value is added to the array only once.
    •	array_remove: Removes a specified value from the array.
    •	to_array: Converts a value to an array if it’s not already an array.

  2. DOM Manipulating:
    •	$: Fetches an element by its ID.
    •	$class: Fetches elements by their class name.
    •	updateStyles: Updates the styles of an element.
    •	hide: Hides an element.
    •	show: Shows an element.
	•	scrollToElement: Scrolls to an element smoothly.
 
  3. Event Handling:
    •	preventDefaults: Prevents default action and event propagation.
    •	on_key: Executes a function when a specified key is pressed on an element.
    •	tab_showing: Checks if the tab is visible.
    •	on_tab_visibility: Executes a function when the tab’s visibility changes.

  4. Local Storage:  
    •	LS: LocalStorage utility functions (get, set, delete).

  5. Mode Checking:
    •	isDarkMode: Checks if the user’s preference is dark mode.
    •	isLightMode: Checks if the user’s preference is light mode.

  6. Resource Loading:
    •	loadCSS: Loads a CSS file from a URL.
    •	loadHighlightingCSS: Loads CSS for syntax highlighting based on the user’s color scheme.
    •	loadScript: Loads a JavaScript file and executes a callback when done.
    •	load_text: Loads text from a URL.
    •	load_json: Loads JSON from a URL.

  7. Data Converting:
    •	base64ArrayBuffer: Converts an ArrayBuffer to a base64 string.
    •	json: Converts an object to a JSON string.f
    •	parse: Parses a JSON string to an object.

  8. Utility Functions:
    •	uid: Generates a unique identifier based on the current time and random values.
    •	uuid: Generates a universally unique identifier.
    •	annotate_copyable: Makes elements with the “copyable” class copy their text content to the clipboard when clicked.
    •	flash: Flashes an element to indicate an action.
    •	debounce: Creates a debounced version of a function to limit how often it can be called.
    •	throttle: Creates a throttled version of a function to limit the rate at which it can be called.
    •	deepClone: Creates a deep clone of an object.
    •	merge: Merges two objects, deeply copying nested properties.
    •	capitalizeFirstLetter: Capitalizes the first letter of a string.
    •	formatDate: Formats a date to a human-readable string.
    •	isEmptyObject: Checks if an object is empty.
	•	getQueryParam: Gets the value of a query parameter from the URL.
	•	generateRandomColor: Generates a random hex color code.
	•	setCookie: Sets a cookie.
	•	getCookie: Gets a cookie.
	•	eraseCookie: Erases a cookie.
	•	getRandomInt: Generates a random integer between min and max.
	•	isElementInViewport: Checks if an element is in the viewport.
	•	extend: Extends an object with properties from another object.
	•	sortByKey: Sorts an array of objects by a specified key.
*/

/** 1. Array Utilities */
/**
 * 
 * Add value to the array if it doesn't already exist.
 * @param {Array} arr - The array to modify.
 * @param {*} val - The value to add.
 */
export function array_once(arr, val) {
    if (arr.indexOf(val) < 0) {
        arr.push(val);
    }
}

/**
 * Remove a value from the array.
 * @param {Array} arr - The array to modify.
 * @param {*} val - The value to remove.
 * @returns {*} - The removed value.
 */
export function array_remove(arr, val) {
    const idx = arr.indexOf(val);
    if (idx >= 0) {
        arr.splice(idx, 1); // Fixed splice arguments
        return val;
    }
}

/**
 * Convert a non-array value to an array.
 * @param {*} o - The value to convert.
 * @returns {Array} - The converted array.
 */
export function to_array(o) {
    return Array.isArray(o) ? o : [o];
}

/**
 * Get an element by its ID.
 * @param {string} id - The ID of the element.
 * @returns {HTMLElement} - The found element.
 */
export function $(id) {
    return document.getElementById(id);
}

/**
 * Get elements by their class name.
 * @param {string} clazz - The class name of the elements.
 * @returns {Array} - Array of found elements.
 */
export function $class(clazz) {
    return [...document.getElementsByClassName(clazz)];
}

/**
 * Prevent default action and stop event propagation.
 * @param {Event} e - The event to handle.
 */
export function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Generate a unique identifier based on the current time and random values.
 * @returns {string} - The generated unique identifier.
 */
export function uid() {
    return `${Date.now().toString(36).padStart(8, '0')}${(Math.round(Math.random() * 0xffffffffff)).toString(36).padStart(8, '0')}`;
}

/**
 * Generate a UUID.
 * @returns {string} - The generated UUID.
 */
export function uuid() {
    return 'xxxxx-xxxxx-xxxxx-xxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Convert an object to a JSON string.
 * @param {Object} o - The object to convert.
 * @returns {string} - The JSON string.
 */
export function json(o) {
    return JSON.stringify(o);
}

/**
 * Parse a JSON string into an object.
 * @param {string} s - The JSON string to parse.
 * @returns {Object} - The parsed object.
 */
export function parse(s) {
    return JSON.parse(s);
}

/**
 * Make elements with the 'copyable' class copy their text content to the clipboard when clicked.
 */
export function annotate_copyable() {
    $class("copyable").forEach(el => {
        el.onclick = () => {
            navigator.clipboard.writeText(el.innerText);
            flash(el);
        };
    });
}

/**
 * Flash an element to indicate an action.
 * @param {HTMLElement} el - The element to flash.
 */
export function flash(el) {
    el.classList.add("flash");
    setTimeout(() => {
        el.classList.remove("flash");
    }, 100);
}

/**
 * Hide an element.
 * @param {HTMLElement|string} el - The element or ID of the element to hide.
 */
export function hide(el) {
    to_array(el).forEach(el => {
        el = typeof (el) === 'object' ? el : $(el);
        if (el._old_display !== undefined || el.style.display === "none") {
            // already hidden
            return;
        }
        el._old_display = el.style.display;
        el.style.display = 'none';
    });
}

/**
 * Show an element.
 * @param {HTMLElement|string} el - The element or ID of the element to show.
 * @param {string} [mode] - The display mode.
 */
export function show(el, mode) {
    to_array(el).forEach(el => {
        el = typeof (el) === 'object' ? el : $(el);
        el.style.display = mode || el._old_display || '';
        delete el._old_display;
    });
}

/**
 * Load text from a URL.
 * @param {string} url - The URL to load text from.
 * @returns {Promise<string>} - The loaded text.
 */
export async function load_text(url) {
    return fetch(url).then(r => r.text());
}

/**
 * Load JSON from a URL.
 * @param {string} url - The URL to load JSON from.
 * @returns {Promise<Object>} - The loaded JSON.
 */
export async function load_json(url) {
    return fetch(url).then(r => r.json());
}

/**
 * Execute a function when a specific key is pressed on an element.
 * @param {string} key - The key code.
 * @param {HTMLElement|string} el - The element or ID of the element.
 * @param {Function} fn - The function to execute.
 */
export function on_key(key, el, fn) {
    el = typeof (el) === 'string' ? $(el) : el;
    el.onkeydown = (ev) => {
        if (ev.code === key) {
            fn(ev);
            preventDefaults(ev);
        }
    };
}

/**
 * Check if the tab is visible.
 * @returns {boolean} - True if the tab is visible, false otherwise.
 */
export function tab_showing() {
    return document.visibilityState === 'visible';
}

/**
 * Execute a function when the tab visibility changes.
 * @param {Function} fn - The function to execute.
 */
export function on_tab_visibility(fn) {
    document.addEventListener('visibilitychange', fn, false);
}

export const LS = {
    get(key) { return localStorage.getItem(key) },
    set(key, val) { return localStorage.setItem(key, val) },
    delete(key) { return localStorage.removeItem(key) },
};

export const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

export const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;

/**
 * Load a CSS file from a URL.
 * @param {string} url - The URL to load the CSS from.
 */
export function loadCSS(url) {
    const link = document.createElement('link');
    link.href = url;
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
}

/**
 * Load highlighting CSS based on the user's color scheme preference.
 */
export function loadHighlightingCSS() {
    if (isLightMode) {
        loadCSS('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/default.min.css');
    } else if (isDarkMode) {
        loadCSS('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/dark.min.css');
    }
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer to convert.
 * @returns {string} - The base64 string.
 */
export function base64ArrayBuffer(arrayBuffer) {
    var base64 = '';
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var bytes = new Uint8Array(arrayBuffer);
    var byteLength = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    for (var i = 0; i < mainLength; i += 3) {
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        a = (chunk & 16515072) >> 18;
        b = (chunk & 258048) >> 12;
        c = (chunk & 4032) >> 6;
        d = chunk & 63;
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    if (byteRemainder == 1) {
        chunk = bytes[mainLength];
        a = (chunk & 252) >> 2;
        b = (chunk & 3) << 4;
        base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
        a = (chunk & 64512) >> 10;
        b = (chunk & 1008) >> 4;
        c = (chunk & 15) << 2;
        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
}

/**
 * Utility functions to extend.
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function to limit the rate at which a function can fire.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time interval in milliseconds.
 * @returns {Function} - The throttled function.
 */
export function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this, args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Deep clone an object.
 * @param {Object} obj - The object to clone.
 * @returns {Object} - The cloned object.
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge two objects.
 * @param {Object} target - The target object.
 * @param {Object} source - The source object.
 * @returns {Object} - The merged object.
 */
export function merge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object) {
            Object.assign(source[key], merge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} - The capitalized string.
 */
export function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a date to a readable string.
 * @param {Date} date - The date to format.
 * @returns {string} - The formatted date string.
 */
export function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Check if an object is empty.
 * @param {Object} obj - The object to check.
 * @returns {boolean} - True if the object is empty, false otherwise.
 */
export function isEmptyObject(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export function updateStyles(element, styles) {
    for (const property in styles) {
        element.style[property] = styles[property];
    }
}

export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

export function scrollToElement(selector) {
    document.querySelector(selector).scrollIntoView({ behavior: 'smooth' });
}

export function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function loadScript(url, callback) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

export function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export function extend(destination, source) {
    for (const property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property];
        }
    }
    return destination;
}

export function sortByKey(array, key) {
    return array.sort((a, b) => {
        const x = a[key]; const y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}