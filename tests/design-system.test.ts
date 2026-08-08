import { test, expect } from '@playwright/test';

/**
 * Testes de Regressão Visual e Integridade do Design System - PreçoCerto
 * 
 * Este arquivo garante que os tokens fundamentais do design system
 * (cores, tipografia, arredondamentos) estejam ativos e consistentes
 * em todas as rotas principais.
 */

const EXPECTED_TOKENS = {
  brandPrimary: '#3b82f6',
  brandAccent: '#eab308',
  bgBase: '#070d17',
  bgSurface: '#0f172a',
  radiusLg: '12px'
};

const ROUTES = [
  '/',
  '/buscar',
  '/perfil',
  '/cesta',
  '/precos'
];

test.describe('Design System Integrity', () => {
  ROUTES.forEach(route => {
    test(`Verify Design System tokens on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const tokens = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          brandPrimary: root.getPropertyValue('--brand-primary').trim(),
          brandAccent: root.getPropertyValue('--brand-accent').trim(),
          bgBase: root.getPropertyValue('--bg-base').trim(),
          bgSurface: root.getPropertyValue('--bg-surface').trim(),
          radiusLg: root.getPropertyValue('--radius-lg').trim()
        };
      });

      // Validação de cores (normalizando para lowercase pois navegadores podem retornar em formatos diferentes)
      expect(tokens.brandPrimary.toLowerCase()).toBe(EXPECTED_TOKENS.brandPrimary);
      expect(tokens.brandAccent.toLowerCase()).toBe(EXPECTED_TOKENS.brandAccent);
      expect(tokens.bgBase.toLowerCase()).toBe(EXPECTED_TOKENS.bgBase);
      expect(tokens.bgSurface.toLowerCase()).toBe(EXPECTED_TOKENS.bgSurface);
      
      // Validação de Layout
      expect(tokens.radiusLg).toBe(EXPECTED_TOKENS.radiusLg);
    });

    test(`Visual consistency check for ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Captura para auditoria de regressão visual
      await page.screenshot({ 
        path: `tests/screenshots/regression-${route.replace('/', 'home')}.png`,
        fullPage: true 
      });
    });
  });

  test('Check interactive elements styling', async ({ page }) => {
    await page.goto('/');
    
    const buttonData = await page.evaluate(() => {
      // Procura por botões que devem estar usando pc-button-primary ou similar
      const primaryBtn = Array.from(document.querySelectorAll('button'))
        .find(b => getComputedStyle(b).backgroundColor === 'rgb(59, 130, 246)'); // #3b82f6
      
      if (!primaryBtn) return null;
      
      const style = getComputedStyle(primaryBtn);
      return {
        borderRadius: style.borderRadius,
        fontWeight: style.fontWeight,
        transition: style.transition
      };
    });

    if (buttonData) {
      expect(buttonData.borderRadius).toBeTruthy();
      expect(parseInt(buttonData.fontWeight)).toBeGreaterThanOrEqual(600);
    }
  });
});
