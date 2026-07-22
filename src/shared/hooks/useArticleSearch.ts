// ─── Hook recherche article — texte, code article, ou code-barres ────────────
import { useQuery } from '@tanstack/react-query';
import { itemService } from '@shared/services';
import type { IArticle } from '@shared/types';
import useDebounce from './useDebounce';

type SearchModeT = 'text' | 'code' | 'barcode';

interface IUseArticleSearchResult {
  articles: IArticle[];
  isSearching: boolean;
  error: Error | null;
  searchMode: SearchModeT;
  reset: () => void;
}

/**
 * Détecte automatiquement le mode de recherche :
 * - ≥ 8 chiffres consécutifs → barcode (EAN-8 / EAN-13)
 * - Lettre IMMÉDIATEMENT suivie d'un chiffre → code article (ex: A034, B12, C00)
 * - Tout le reste → nom d'article (ex: marlboro, coca cola, lait)
 */
const detectSearchMode = (term: string): SearchModeT => {
  if (/^\d{8,}$/.test(term)) return 'barcode';
  if (/^[A-Za-z]\d/.test(term)) return 'code';
  return 'text';
};

const useArticleSearch = (
  searchTerm: string,
  searchMode?: SearchModeT
): IUseArticleSearchResult => {
  const debouncedTerm = useDebounce(searchTerm, 400);
  const activeMode = searchMode ?? detectSearchMode(searchTerm);

  // Mode texte : recherche par nom (debounced)
  const textQuery = useQuery({
    queryKey: ['items', 'search', debouncedTerm],
    queryFn: () => itemService.searchByName(debouncedTerm),
    enabled: activeMode === 'text' && debouncedTerm.length >= 2,
  });

  // Mode code : recherche par code article (debounced)
  const codeQuery = useQuery({
    queryKey: ['items', 'code', debouncedTerm],
    queryFn: () => itemService.searchByCode(debouncedTerm),
    enabled: activeMode === 'code' && debouncedTerm.length >= 2,
  });

  // Mode barcode : immédiat, pas de debounce
  const barcodeQuery = useQuery({
    queryKey: ['items', 'barcode', searchTerm],
    queryFn: async () => {
      const article = await itemService.searchByBarcode(searchTerm);
      return article ? [article] : [];
    },
    enabled: activeMode === 'barcode' && searchTerm.length >= 8,
  });

  const activeQuery =
    activeMode === 'barcode'
      ? barcodeQuery
      : activeMode === 'code'
        ? codeQuery
        : textQuery;

  return {
    articles: activeQuery.data ?? [],
    isSearching: activeQuery.isLoading,
    error: activeQuery.error as Error | null,
    searchMode: activeMode,
    reset: () => {
      // Le reset se fait en passant un searchTerm vide côté parent
    },
  };
};

export default useArticleSearch;
