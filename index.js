#! /usr/bin/env node
const os = require("os");

// Snapshot per-core averages (idle/total) instead of overall average
function cpuSnapshotPerCore() {
  return os.cpus().map((cpu) => {
    let total = 0;
    for (const type in cpu.times) total += cpu.times[type];
    return { idle: cpu.times.idle, total };
  });
}

// function to calculate average of array
const arrAvg = function (arr) {
  if (arr && arr.length >= 1) {
    const sumArr = arr.reduce((a, b) => a + b, 0);
    return sumArr / arr.length;
  }
};

// Per-core load averages over a sampling window
function getCPULoadPerCoreAVG(avgTime = 1000, delay = 100) {
  return new Promise((resolve, reject) => {
    const n = Math.floor(avgTime / delay);
    if (n <= 1) return reject(new Error("Error: interval too small"));

    const first = cpuSnapshotPerCore();
    const samples = Array.from({ length: first.length }, () => []);
    let i = 0;

    const interval = setInterval(() => {
      if (i >= n) {
        clearInterval(interval);
        // Return integer % per core
        return resolve(
          samples.map((coreSamples) => Math.floor(arrAvg(coreSamples) * 100)),
        );
      }

      const next = cpuSnapshotPerCore();

      for (let c = 0; c < next.length; c++) {
        const totalDiff = next[c].total - first[c].total;
        const idleDiff = next[c].idle - first[c].idle;

        const usage = totalDiff > 0 ? 1 - idleDiff / totalDiff : 0;
        samples[c].push(usage);
      }

      i++;
    }, delay);
  });
}

getCPULoadPerCoreAVG(1000, 100).then((perCore) => {
  // e.g. "Core 0: 12%  Core 1: 8% ..."
  console.log(perCore.map((p, i) => `Core ${i}: ${p}%`).join("\n"));
});
