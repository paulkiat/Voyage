// starts and maintains all under one process:
// 1. customer app web server
// 2. customer app itinerary planner server
// 3. customer app kv-store server

const { args, launch } = require('./common.js');

// Extract arguments for app configuration
const ids = (args.id || args['app-id'] || "").split(",");
const dirs = (args.dir || args['app-dir'] || "app").split(",");
const port = args.port || args['app-port'] || 4200;

console.log({ ids, dirs });

// Launch each app component with appropriate arguments
ids.forEach((id, index) => {
    const app_args = [`--app-id=${id}`, `--app-dir=${dirs[index]}`, `--app-port=${port}`];
    if (args.direct) app_args.push("--direct");

    // Launch web server for the app
    launch(`app web ${id}`, "./src/app/app-web.js", app_args);

    // Launch itinerary planner server for the app
    launch(`app plan ${id}`, "./src/app/app-doc.js", [`--app-id=${id}`]);

    // Launch key-value store server for the app
    launch(`app store ${id}`, "./src/app/app-store.js", [`--app-id=${id}`]);

    // Add additional launches for other features as needed
    launch(`app booking ${id}`, "./src/app/app-booking.js", [`--app-id=${id}`]);
    launch(`app map ${id}`, "./src/app/app-map.js", [`--app-id=${id}`]);
    launch(`app recommendations ${id}`, "./src/app/app-recommendations.js", [`--app-id=${id}`]);
    launch(`app guides ${id}`, "./src/app/app-guides.js", [`--app-id=${id}`]);
    launch(`app weather ${id}`, "./src/app/app-weather.js", [`--app-id=${id}`]);
    launch(`app expense ${id}`, "./src/app/app-expense.js", [`--app-id=${id}`]);
    launch(`app social ${id}`, "./src/app/app-social.js", [`--app-id=${id}`]);
    launch(`app journal ${id}`, "./src/app/app-journal.js", [`--app-id=${id}`]);
    launch(`app translator ${id}`, "./src/app/app-translator.js", [`--app-id=${id}`]);
    launch(`app emergency ${id}`, "./src/app/app-emergency.js", [`--app-id=${id}`]);
});