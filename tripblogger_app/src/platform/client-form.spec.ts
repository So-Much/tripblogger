import {
  desktopColumnWidth,
  productColumnCount,
  resolveClientForm,
  WEB_DESKTOP_COLUMN,
} from './client-form';

describe('resolveClientForm', () => {
  it('treats a narrow window as a phone on every platform', () => {
    expect(resolveClientForm('ios', 390)).toBe('phone');
    expect(resolveClientForm('android', 400)).toBe('phone');
    expect(resolveClientForm('web', 390)).toBe('phone');
  });

  it('treats a medium window as a tablet, including a wide native device', () => {
    expect(resolveClientForm('web', 768)).toBe('tablet');
    expect(resolveClientForm('web', 1099)).toBe('tablet');
    expect(resolveClientForm('ios', 1400)).toBe('tablet');
  });

  it('treats a wide browser as desktop', () => {
    expect(resolveClientForm('web', 1100)).toBe('desktop');
    expect(resolveClientForm('web', 1440)).toBe('desktop');
  });

  it('sizes the reading column and shop grid from the form', () => {
    expect(desktopColumnWidth(1440)).toBe(WEB_DESKTOP_COLUMN);
    expect(desktopColumnWidth(700)).toBe(652);
    expect(productColumnCount('desktop', 1440)).toBe(5);
    expect(productColumnCount('tablet', 900)).toBe(3);
    expect(productColumnCount('phone', 390)).toBe(2);
  });
});
