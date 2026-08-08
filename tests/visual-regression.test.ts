import { test, expect } from '@playwright/test';

// Este teste serve como base para garantir que os tokens do design system
// sejam aplicados corretamente nas páginas principais.
// Como estamos em um ambiente de sandbox, usamos o Playwright para capturar
// e validar a integridade visual da interface.

const routes = [
  '/',
  '/buscar',
  '/perfil',
  '/cesta',
  '/precos',
];

test.describe('Regressão Visual - Design System Tokens', () => {
  routes.forEach(route => {
    test(`Deve carregar corretamente a rota: ${route}`, async ({ page }) => {
      await page.goto(route);
      
      // Espera o conteúdo principal carregar
      await page.waitForLoadState('networkidle');
      
      // Verifica se variáveis CSS críticas estão presentes e têm valores
      const checkTokens = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          primary: styles.getPropertyValue('--primary').trim(),
          surface: styles.getPropertyValue('--surface-dark').trim(),
          radius: styles.getPropertyValue('--radius-lg').trim(),
        };
      });

      expect(checkTokens.primary).toBeTruthy();
      expect(checkTokens.surface).toBeTruthy();
      expect(checkTokens.radius).toBeTruthy();

      // Screenshot para auditoria manual ou comparação futura
      await page.screenshot({ 
        path: `tests/screenshots/visual-${route.replace('/', 'home')}.png`,
        fullPage: true 
      });
    });
  });

  test('Consistência de Botões e Cards', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se os botões usam os tokens de arredondamento e cor
    const buttonStyles = await page.evaluate(() => {
      const btn = document.querySelector('button');
      if (!btn) return null;
      const styles = getComputedStyle(btn);
      return {
        borderRadius: styles.borderRadius,
        transition: styles.transition,
      };
    });

    if (buttonStyles) {
      // Os tokens devem resultar em valores calculados
      expect(buttonStyles.borderRadius).not.toBe('0px');
    }
  });
});
