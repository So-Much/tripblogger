declare module 'ffmpeg-kit-react-native' {
  type FFmpegSession = {
    getReturnCode: () => Promise<unknown> | unknown;
    getAllLogsAsString: (timeout?: number) => Promise<string>;
  };

  export const FFmpegKit: {
    execute: (command: string) => Promise<FFmpegSession>;
    executeWithArguments: (args: string[]) => Promise<FFmpegSession>;
  };

  export const ReturnCode: {
    isSuccess: (code: unknown) => boolean;
  };
}
