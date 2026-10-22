"""Confere as regras comerciais dos três planos.

Uso:
    .\\.venv\\Scripts\\python.exe verificar_precos.py

Regras verificadas para cada tipo de projeto:
  1. Essencial e Profissional com preços próximos (até 20% de diferença);
  2. Premium pelo menos 80% acima do Profissional;
  3. Valor/hora do Profissional acima do mínimo saudável.

As regras 1 e 2 são conferidas no preço do pacote (`preco_escopo`), que é o
valor mostrado ao cliente nos três cartões — com ou sem extras marcados.
"""

from __future__ import annotations

import sys

from app import constantes as C
from app import schemas
from app.services import calcular_orcamento

PROXIMIDADE_MAXIMA = 1.20  # Essencial -> Profissional
SALTO_MINIMO = 1.80  # Profissional -> Premium


def _brl(valor: float) -> str:
    inteiro = f"{valor:,.0f}"
    return "R$ " + inteiro.replace(",", ".")


def _conferir(tipo: str, extras: list[str], falhas: list[str]) -> tuple[float, float, float]:
    paginas = C.TIPOS_PRECO[tipo]["paginas_incluidas"]
    orcamento = calcular_orcamento(
        schemas.OrcamentoEntrada(tipo_site=tipo, paginas=paginas, extras=extras)
    )
    essencial, profissional, premium = orcamento.planos

    proporcao_12 = profissional.preco_escopo / essencial.preco_escopo
    proporcao_23 = premium.preco_escopo / profissional.preco_escopo
    contexto = f"{tipo} (com extras)" if extras else tipo

    if proporcao_12 > PROXIMIDADE_MAXIMA:
        falhas.append(
            f"{contexto}: Profissional {proporcao_12:.2f}x o Essencial "
            f"(máximo {PROXIMIDADE_MAXIMA:.2f}x)"
        )
    if proporcao_12 < 1.0:
        falhas.append(f"{contexto}: Profissional mais barato que o Essencial")
    if proporcao_23 < SALTO_MINIMO:
        falhas.append(
            f"{contexto}: Premium apenas {proporcao_23:.2f}x o Profissional "
            f"(mínimo {SALTO_MINIMO:.2f}x)"
        )

    return proporcao_12, proporcao_23, profissional.valor_hora


def verificar() -> int:
    falhas: list[str] = []
    todos_extras = [extra["id"] for extra in C.EXTRAS_CALCULADORA]

    print(
        f"{'Tipo':<28} {'Essencial':>12} {'Profissional':>13} {'Premium':>12} "
        f"{'P2/P1':>7} {'P3/P2':>7} {'R$/h':>7}"
    )
    print("-" * 94)

    for tipo in C.TIPOS_SITE:
        paginas = C.TIPOS_PRECO[tipo]["paginas_incluidas"]
        orcamento = calcular_orcamento(
            schemas.OrcamentoEntrada(tipo_site=tipo, paginas=paginas)
        )
        essencial, profissional, premium = orcamento.planos
        proporcao_12, proporcao_23, valor_hora = _conferir(tipo, [], falhas)

        print(
            f"{tipo:<28} {_brl(essencial.preco_escopo):>12} "
            f"{_brl(profissional.preco_escopo):>13} {_brl(premium.preco_escopo):>12} "
            f"{proporcao_12:>7.2f} {proporcao_23:>7.2f} {valor_hora:>7.0f}"
        )

        if valor_hora < C.VALOR_HORA_MINIMO:
            falhas.append(
                f"{tipo}: valor/hora {valor_hora:.0f} abaixo do mínimo "
                f"{C.VALOR_HORA_MINIMO:.0f}"
            )

        # Os cartões não podem inverter a ordem quando o cliente marca extras.
        _conferir(tipo, todos_extras, falhas)

    print()
    if falhas:
        print("FALHOU")
        for falha in falhas:
            print(f"  - {falha}")
        return 1

    print("OK: os três planos seguem as regras em todos os tipos e com qualquer extra.")
    return 0


if __name__ == "__main__":
    sys.exit(verificar())
