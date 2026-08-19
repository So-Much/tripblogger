import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
  title: string;
  body: string;
  action: string;
};

type State = { hasError: boolean };

/**
 * Catches render errors so a single subtree throw cannot white-screen the app.
 * Native SIGABRT from maps/gestures still must be prevented at the call site.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{this.props.title}</Text>
        <Text style={styles.body}>{this.props.body}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ hasError: false })}
          style={styles.btn}>
          <Text style={styles.btnText}>{this.props.action}</Text>
        </Pressable>
      </View>
    );
  }
}

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

/**
 * In production, swallow uncaught JS exceptions so they cannot kill the process.
 * Dev keeps the previous handler (redbox).
 */
export function installJsExceptionGuard(): () => void {
  const ErrorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!ErrorUtils?.setGlobalHandler) return () => {};

  const previous = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      previous?.(error, isFatal);
    }
  });

  return () => {
    if (previous) ErrorUtils.setGlobalHandler(previous);
  };
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#0F172A',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: '#CBD5E1',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
