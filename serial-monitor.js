#!/usr/bin/env node

const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

// Get parameters from command line
const portName = process.argv[2] || 'COM18';
const baudRate = parseInt(process.argv[3] || '115200', 10);
const logFileName = process.argv[4] ? path.resolve(process.argv[4]) : null;

let currentPort = null;
let logStream = null;

// Open log file if provided
if (logFileName) {
  logStream = fs.createWriteStream(logFileName, { flags: 'a' });
  console.log(`Logging output to file: ${logFileName}`);
}

// Timestamp [YYYY-MM-DD HH:MM:SS] for port open event
function getDateTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// Timestamp [HH:MM:SS] for each line of data or events
function getTimeStamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}] `;
}

// Helper to log messages to console and file
function logMessage(msg) {
  const line = getTimeStamp() + msg + '\n';
  process.stdout.write(line);
  if (logStream) logStream.write(line);
}

async function checkPorts() {
  try {
    const ports = await SerialPort.list();
    const found = ports.find(p => p.path.toUpperCase() === portName.toUpperCase());

    if (found && !currentPort) {
      const timestamp = getDateTimestamp();
      console.log(`[${timestamp}] Port ${portName} opened (baudRate=${baudRate})`);

      currentPort = new SerialPort({ path: portName, baudRate: baudRate });

      currentPort.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach((line, index) => {
          if (line.trim() !== '' || index < lines.length - 1) {
            logMessage(line);
          }
        });
      });

      currentPort.on('close', () => {
        logMessage(`Port ${portName} closed`);
        currentPort = null;
      });

      currentPort.on('error', (err) => {
        logMessage(`Error: ${err.message}`);
      });
    }

    if (!found && currentPort) {
      logMessage(`Port ${portName} disconnected`);
      currentPort.close();
      currentPort = null;
    }
  } catch (err) {
    logMessage("Error while checking ports: " + err);
  }
}

// check every 2 seconds
setInterval(checkPorts, 2000);

console.log(`Monitoring port ${portName} (baudRate=${baudRate})...`);
