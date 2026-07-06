/** Browser tab capture cropped to the cartoon stage, saved as WebM (YouTube-ready). */
export class CartoonRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private active = false;

  /** Fired when the user stops sharing via the browser UI. */
  onCaptureEnded: (() => void) | null = null;

  isRecording(): boolean {
    return this.active;
  }

  async start(captureElement: HTMLElement, audioStream?: MediaStream): Promise<void> {
    if (this.active) return;

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
        displaySurface: "browser",
      } as MediaTrackConstraints,
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaStreamOptions);

    const videoTrack = displayStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener("ended", () => {
        this.onCaptureEnded?.();
      });

      if ("cropTo" in videoTrack && typeof CropTarget !== "undefined") {
        try {
          const cropTarget = await CropTarget.fromElement(captureElement);
          await videoTrack.cropTo(cropTarget);
        } catch {
          // CropTarget is Chromium-only; fall back to full tab capture.
        }
      }
    }

    const tracks: MediaStreamTrack[] = [];
    if (videoTrack) tracks.push(videoTrack);
    if (audioStream) {
      for (const track of audioStream.getAudioTracks()) {
        tracks.push(track);
      }
    }

    const stream = new MediaStream(tracks);

    const mimeType = pickRecorderMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 })
      : new MediaRecorder(stream, { videoBitsPerSecond: 5_000_000 });

    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    this.stream = stream;
    this.active = true;
    this.recorder.start(1000);
  }

  stop(): Promise<Blob | null> {
    if (!this.active || !this.recorder) return Promise.resolve(null);

    const recorder = this.recorder;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "video/webm";
        const blob = this.chunks.length ? new Blob(this.chunks, { type }) : null;
        this.cleanup();
        resolve(blob);
      };

      if (recorder.state !== "inactive") recorder.stop();
      else {
        this.cleanup();
        resolve(null);
      }
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.active = false;
    this.chunks = [];
  }
}

export function downloadRecording(blob: Blob, title: string): void {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "cartoon"}.${ext}`;
  link.click();
  URL.revokeObjectURL(url);
}

function pickRecorderMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
