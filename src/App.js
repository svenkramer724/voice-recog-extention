import "./App.css";

import React, { useState } from "react";
import { FFT } from "dsp.js";

function App() {
  const [captureState, setCaptureState] = useState(true);

  const [voiceData, setVoiceData] = useState([]);

  const [similarity, setSimilarity] = useState("");

  const clickBtn = async () => {
    setCaptureState((prevState) => !prevState);
    if (captureState)
      switch (voiceData.length) {
        case 0:
          setVoiceData([
            { name: "First Voice", hash: await getSign("aud.wav") },
          ]);
          break;
        case 1:
          let sign = await getSign("aud.wav");
          setVoiceData((prevState) =>
            prevState.concat([{ name: "Second Voice", hash: sign }])
          );
          break;
        default:
          setVoiceData([]);
          break;
      }
  };

  const getSign = async (url) => {
    let audioContext;

    const response = await fetch(url);
    const audioData = await response.arrayBuffer();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const audioBuffer = await audioContext.decodeAudioData(audioData);

    const bufferSize = 2048;
    const numChannels = audioBuffer.numberOfChannels;

    const timeDomainDataArray = [];
    const frequencyDomainDataArray = [];

    for (let channel = 0; channel < numChannels; channel++) {
      let audioChannelData = audioBuffer.getChannelData(channel);

      if (audioChannelData.length > bufferSize) {
        audioChannelData = audioChannelData.slice(0, bufferSize);
      } else if (audioChannelData.length < bufferSize) {
        const padding = Array.from({
          length: bufferSize - audioChannelData.length,
        }).fill(0);
        audioChannelData = [...audioChannelData, ...padding];
      }

      const fft = new FFT(bufferSize, audioContext.sampleRate);
      fft.forward(audioChannelData);
      const frequencyDomainData = Array.from(fft.spectrum);

      timeDomainDataArray.push(audioChannelData);
      frequencyDomainDataArray.push(frequencyDomainData);
    }

    const combinedTimeDomainDataArray = new Array(bufferSize).fill(0).map(
      (ele, j) =>
        new Array(numChannels)
          .fill(0)
          .map((e, i) => timeDomainDataArray[i][j])
          .reduce((t, n) => t + n) / numChannels
    );

    const combinedFrequencyDomainDataArray = new Array(bufferSize / 2)
      .fill(0)
      .map(
        (ele, j) =>
          new Array(numChannels)
            .fill(0)
            .map((e, i) => frequencyDomainDataArray[i][j])
            .reduce((t, n) => t + n) / numChannels
      );

    return generateHashes(combinedFrequencyDomainDataArray);
  };

  const generateHashes = (signatures) => {
    const startFrequency = 100;
    const endFrequency = 2000;

    const startIndex = Math.floor((startFrequency * signatures.length) / 44100);
    const endIndex = Math.ceil((endFrequency * signatures.length) / 44100);

    const selectSignatures = signatures.slice(startIndex, endIndex);
    console.log(selectSignatures);

    const hash = selectSignatures.join(",");

    return selectSignatures;
  };

  const compare = () => {
    const signalA = voiceData[0]["hash"];
    const signalB = voiceData[1]["hash"];

    const result = [];
    const signalALength = signalA.length;
    const signalBLength = signalB.length;

    for (let n = -signalALength + 1; n < signalBLength; n++) {
      let value = 0;
      for (let k = 0; k < signalALength; k++) {
        if (n + k >= 0 && n + k < signalBLength) {
          value += signalA[k] * signalB[n + k];
        }
      }
      result.push(value);
    }
    console.log("Similarity: " + Math.max(...result));
    setSimilarity(((1 - Math.max(...result)) * 100).toFixed(8));
  };

  return (
    <div className="w-[360px] h-[420px] p-8">
      <h1 className="text-red-500 text-center txt-2xl">
        Audio Signature Extension
      </h1>
      <div className="container mt-10">
        <div className="flex flex-col">
          <button
            className="px-4 py-2 text-red-500 border text-base border-red-500"
            onClick={clickBtn}
            disabled={voiceData.length === 2 && captureState}
          >
            {captureState ? "Start" : "Stop"}
          </button>
          {voiceData.length === 0 ? (
            <></>
          ) : (
            <div className="mt-4 w-full flex flex-col">
              {voiceData.map((data, idx) => (
                <div
                  key={`nm-${idx}`}
                  className="w-full my-2 text-center text-xl text-green-500"
                >
                  {data.name}
                </div>
              ))}
            </div>
          )}
          {voiceData.length === 2 && captureState && (
            <button
              className="mt-6 w-full px-4 py-2 text-base text-red-500 border border-red-500"
              onClick={compare}
            >
              Compare
            </button>
          )}
          <h2 className="text-center mt-6 text-base text-green-500">
            {similarity !== "" && `Similarity: ${similarity}%`}
          </h2>
        </div>
      </div>
    </div>
  );
}

export default App;
