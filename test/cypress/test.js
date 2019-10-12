const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

global.log = function(msg) {
    let now = new Date().toLocaleTimeString();
    console.log(`[${now}] ${msg}\n`);
};

function build(dir) {
    global.log('Building ...');
    child_process.spawnSync('dotnet', ['build', '-c', 'release'], { cwd: dir });
}
function clean(dir) {
    rimraf(path.join(dir, 'App_Data'), function() {
        global.log('App_Data deleted');
    });
}

function host(dir, assembly) {
    if (fs.existsSync(path.join(dir, 'bin/release/netcoreapp3.0/', assembly))) {
        global.log('Application already built, skipping build');
    } else {
        build(dir);
    }
    global.log('Starting application ...');
    let server = child_process.spawn('dotnet', ['bin/release/netcoreapp3.0/' + assembly], { cwd: dir });

    server.stdout.on('data', data => {
        global.log(data);
    });

    server.stderr.on('data', data => {
        global.log(`stderr: ${data}`);
    });

    server.on('close', code => {
        global.log(`Server process exited with code ${code}`);
    });
    return server;
}

module.exports = {
    build,
    clean,
    host,
    e2e: function(dir, assembly, removeAppData = false, rebuild = false) {
        global._LOG_ = '';

        if (rebuild === true) {
            build(dir);
        }

        if (fs.existsSync(path.join(dir, 'bin/release/netcoreapp3.0/', assembly))) {
            global.log('Application already built, skipping build');
        } else {
            build(dir);
        }

        if (removeAppData === true) {
            clean(dir);
        }

        var server = host(dir, assembly);

        let test = child_process.exec('npm run cypress');
        test.stdout.on('data', data => {
            console.log(data);
        });

        test.stderr.on('data', data => {
            console.log(`stderr: ${data}`);
        });

        test.on('close', code => {
            console.log(`Cypress process exited with code ${code}`);
            server.kill('SIGINT');
            process.exit(code);
        });
    }
};