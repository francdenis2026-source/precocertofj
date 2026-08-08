---
name: mcp-integration
description: Habilita a integração de agentes com ferramentas externas via Model Context Protocol (MCP).
type: feature
---

# MCP Integration Skill

Esta skill permite que o PreçoCerto se conecte a servidores MCP para estender as capacidades do agente com ferramentas externas (ex: consulta de estoque real, integração com ERPs locais, ou ferramentas de análise de dados avançadas).

## Como usar
Solicite ao agente para "Conectar um servidor MCP" ou "Usar ferramenta MCP [nome]" para interagir com extensões instaladas.

## Configuração
Os servidores MCP são configurados via `lovable-mcp.config.json` na raiz do projeto.