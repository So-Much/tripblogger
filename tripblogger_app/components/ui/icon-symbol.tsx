// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'person.crop.circle.fill': 'person',
  'cart.fill': 'shopping-cart',
  'video.fill': 'videocam',
  'envelope.fill': 'mail',
  'bolt.fill': 'bolt',
  'bolt.slash.fill': 'flash-off',
  'bolt.badge.automatic': 'flash-auto',
  'magnifyingglass': 'search',
  'ellipsis': 'more-horiz',
  'heart.fill': 'favorite',
  heart: 'favorite-border',
  'bubble.left.and.bubble.right.fill': 'chat-bubble-outline',
  'ellipsis.circle': 'more-horiz',
  'gearshape.fill': 'settings',
  'doc.text.fill': 'article',
  'plus.circle.fill': 'add-circle',
  'camera.fill': 'photo-camera',
  'camera.rotate': 'flip-camera-ios',
  'photo.on.rectangle': 'photo-library',
  'checkmark.seal.fill': 'verified',
  'xmark.circle.fill': 'cancel',
  'location.fill': 'my-location',
  'mappin.circle.fill': 'place',
  'clock.fill': 'schedule',
  'storefront.fill': 'storefront',
  'flashlight.on.fill': 'highlight',
  minus: 'remove',
  plus: 'add',
  'square.grid.2x2': 'apps',
  'square.grid.2x2.fill': 'apps',
  'slider.horizontal.3': 'tune',
  'bag.fill': 'work',
  airplane: 'flight',
  'tag.fill': 'local-offer',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'checkmark.circle.fill': 'check-circle',
  'star.fill': 'star',
  'calendar': 'event',
  'map.fill': 'map',
  'flame.fill': 'whatshot',
  'trash.fill': 'delete',
  'bookmark.fill': 'bookmark',
  'square.and.arrow.up': 'share',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
