/**
 * MediaProcessor
 * .......................
 * Handles real-time video and audio processing for Synapse Lite.
 * Features: Background Blur (Canvas), Noise Suppression (Web Audio).
 */

export class MediaProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private processingStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  // Audio nodes
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  constructor() {}

  /**
   * Applies background blur to a video stream.
   * Note: This is a lightweight simulation using Canvas blur.
   * For production "AI" blur, we would use TensorFlow.js BodyPix, 
   * but for this phase we implement a high-performance Canvas filter.
   */
  public async applyBackgroundBlur(stream: MediaStream): Promise<MediaStream> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return stream;

    // Setup Canvas.....................
    this.canvas = document.createElement("canvas");
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = stream;
    this.videoElement.muted = true;
    await this.videoElement.play();

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;
    this.ctx = this.canvas.getContext("2d");

    if (!this.ctx) return stream;

    const processFrame = () => {
      if (!this.ctx || !this.videoElement || !this.canvas) return;

      // Draw original frame
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

      // Apply blur filter to the entire frame (simulated background blur)
      // In a real scenario, we'd segment the person and blur only the background.
      // Here we apply a subtle global blur to enhance focus.
      this.ctx.filter = "blur(8px)";
      
      // To simulate "Subject Focus", we could draw a sharp version in the center 
      // but without ML segmentation it's imperfect. 
      // For now, we apply a high-quality global blur which is a common "Soft Focus" mode.
      
      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    // Capture the processed stream
    const processedStream = (this.canvas as any).captureStream(30);
    
    // Merge back with audio tracks if any
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach(track => processedStream.addTrack(track));

    return processedStream;
  }

  /**
   * Applies a virtual background image.
   */
  public async applyVirtualBackground(stream: MediaStream, imageUrl: string): Promise<MediaStream> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return stream;

    this.canvas = document.createElement("canvas");
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = stream;
    this.videoElement.muted = true;
    await this.videoElement.play();

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;
    this.ctx = this.canvas.getContext("2d");

    const bgImage = new Image();
    bgImage.crossOrigin = "anonymous";
    bgImage.src = imageUrl;
    await new Promise(r => bgImage.onload = r);

    if (!this.ctx) return stream;

    const processFrame = () => {
      if (!this.ctx || !this.videoElement || !this.canvas) return;

      // Draw virtual background
      this.ctx.drawImage(bgImage, 0, 0, this.canvas.width, this.canvas.height);

      // Draw the user (simulated with a soft-edged focus center)
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.canvas.width / 2, this.canvas.height / 2, 
        this.canvas.width / 2.5, this.canvas.height / 1.5, 
        0, 0, Math.PI * 2
      );
      this.ctx.clip();
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    const processedStream = (this.canvas as any).captureStream(30);
    stream.getAudioTracks().forEach(t => processedStream.addTrack(t));
    return processedStream;
  }

  /**
   * Applies noise suppression to an audio stream using Web Audio API.
   */
  public applyNoiseSuppression(stream: MediaStream): MediaStream {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return stream;

    this.audioCtx = new AudioContext();
    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
    this.destinationNode = this.audioCtx.createMediaStreamDestination();

    // High-pass filter to remove low-frequency hum (fans, AC, etc.)
    this.noiseFilter = this.audioCtx.createBiquadFilter();
    this.noiseFilter.type = "highpass";
    this.noiseFilter.frequency.value = 150; // Filter out below 150Hz

    // Dynamics compressor to normalize volume and reduce background noise floor
    const compressor = this.audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    this.sourceNode.connect(this.noiseFilter);
    this.noiseFilter.connect(compressor);
    compressor.connect(this.destinationNode);

    const processedStream = this.destinationNode.stream;
    
    // Merge back with video tracks if any
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach(track => processedStream.addTrack(track));

    return processedStream;
  }

  public stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.audioCtx) this.audioCtx.close();
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
  }
}
