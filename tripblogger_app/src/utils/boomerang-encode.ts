import Constants, { ExecutionEnvironment } from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export class BoomerangEncodeError extends Error {
  readonly code: 'web' | 'expo_go' | 'ffmpeg';

  constructor(code: BoomerangEncodeError['code'], message?: string) {
    super(message ?? code);
    this.name = 'BoomerangEncodeError';
    this.code = code;
  }
}

function stripFileScheme(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

/**
 * Encode a short forward clip + reverse into one MP4 (silent) for infinite-style playback in feed.
 * Does not statically import FFmpeg so Expo Go can load capture without crashing; FFmpeg is lazy-loaded only in dev/native builds that include the module.
 */
export async function encodeBoomerangMp4(inputUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    throw new BoomerangEncodeError('web', 'Boomerang encoding is not available on web.');
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new BoomerangEncodeError('expo_go', 'FFmpeg not available in Expo Go.');
  }

  let FFmpegKit: typeof import('ffmpeg-kit-react-native').FFmpegKit;
  let ReturnCode: typeof import('ffmpeg-kit-react-native').ReturnCode;
  try {
    const mod = await import('ffmpeg-kit-react-native');
    FFmpegKit = mod.FFmpegKit;
    ReturnCode = mod.ReturnCode;
  } catch {
    throw new BoomerangEncodeError('ffmpeg', 'FFmpeg Kit failed to load.');
  }

  const outFile = new File(Paths.cache, `boomerang-${Date.now()}.mp4`);
  const outPath = stripFileScheme(outFile.uri);
  const inPath = stripFileScheme(inputUri);

  const session = await FFmpegKit.executeWithArguments([
    '-y',
    '-i',
    inPath,
    '-an',
    '-filter_complex',
    '[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0,format=yuv420p[outv]',
    '-map',
    '[outv]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    outPath,
  ]);
  const code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    const logs = await session.getAllLogsAsString(5000);
    throw new BoomerangEncodeError('ffmpeg', logs || 'FFmpeg boomerang failed');
  }

  return outFile.uri;
}
