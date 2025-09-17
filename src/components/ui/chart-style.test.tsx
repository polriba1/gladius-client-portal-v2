import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ChartStyle, type ChartConfig } from "./chart"

describe("ChartStyle", () => {
  it("renders CSS variables for safe colors", () => {
    const config: ChartConfig = {
      sales: { color: "#ff0000", label: "Sales" },
    }

    const html = renderToStaticMarkup(
      <ChartStyle id="test" config={config} />
    )

    expect(html).toContain("--color-sales: #ff0000")
  })

  it("filters out unsafe colors", () => {
    const config: ChartConfig = {
      danger: {
        color: "#fff;}</style><script>alert('xss')</script><style>",
        label: "Danger",
      },
    }

    const html = renderToStaticMarkup(
      <ChartStyle id="test" config={config} />
    )

    expect(html).not.toContain("script")
    expect(html).not.toContain("--color-danger")
  })
})

