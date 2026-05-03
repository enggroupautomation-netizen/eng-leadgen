import { createContext, useContext, useState } from 'react'

interface BrandConfig {
  logoUrl: string
  siteName: string
}

const DEFAULT_BRAND: BrandConfig = {
  logoUrl: 'https://www.enggroup.it/wp-content/uploads/2026/02/logo-eng.jpg',
  siteName: 'ENG Platform',
}

function loadBrand(): BrandConfig {
  try {
    const saved = localStorage.getItem('eng_brand')
    if (saved) return { ...DEFAULT_BRAND, ...JSON.parse(saved) }
  } catch {}
  return DEFAULT_BRAND
}

const BrandContext = createContext<{
  brand: BrandConfig
  updateBrand: (partial: Partial<BrandConfig>) => void
}>({
  brand: DEFAULT_BRAND,
  updateBrand: () => {},
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(loadBrand)

  function updateBrand(partial: Partial<BrandConfig>) {
    setBrand(prev => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem('eng_brand', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <BrandContext.Provider value={{ brand, updateBrand }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrand = () => useContext(BrandContext)
