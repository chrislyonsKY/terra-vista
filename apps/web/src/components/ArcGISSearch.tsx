import { useState, useCallback } from "react";
import {
  searchElevationData,
  loadElevationFromService,
} from "../geo/arcgisService";
import type { ArcGISSearchResult } from "../geo/arcgisService";
import type { LoadResult } from "../geo/loader";

interface ArcGISSearchProps {
  onDataLoaded: (result: LoadResult, name: string) => void;
  disabled?: boolean;
}

export function ArcGISSearch({ onDataLoaded, disabled }: ArcGISSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArcGISSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    setHasSearched(true);
    try {
      const items = await searchElevationData(query.trim());
      setResults(items);
      if (items.length === 0) {
        setError("No elevation datasets found. Try different search terms.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed"
      );
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleLoad = useCallback(
    async (item: ArcGISSearchResult) => {
      if (!item.url) {
        setError("This item has no service URL.");
        return;
      }
      setLoadingId(item.id);
      setError(null);
      try {
        const result = await loadElevationFromService(
          item.url,
          item.extent,
          item.title,
          item.type
        );
        onDataLoaded(result, item.title);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load elevation data"
        );
      } finally {
        setLoadingId(null);
      }
    },
    [onDataLoaded]
  );

  return (
    <div className="arcgis-search">
      <div className="arcgis-search-bar" role="search">
        <label htmlFor="arcgis-search-input" className="sr-only">Search ArcGIS Online for elevation data</label>
        <input
          id="arcgis-search-input"
          type="text"
          className="arcgis-search-input"
          placeholder="Search ArcGIS Online..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || searching}
          aria-label="Search ArcGIS Online for elevation data"
        />
        <button
          className="arcgis-search-btn"
          onClick={handleSearch}
          disabled={disabled || searching || !query.trim()}
          aria-busy={searching}
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {error && <div className="arcgis-error">{error}</div>}

      {results.length > 0 && (
        <div className="arcgis-results">
          {results.map((item) => (
            <div key={item.id} className="arcgis-result-item">
              <div className="arcgis-result-info">
                <div className="arcgis-result-title">{item.title}</div>
                <div className="arcgis-result-type">{item.type}</div>
                {item.snippet && (
                  <div className="arcgis-result-snippet">
                    {item.snippet.length > 120
                      ? item.snippet.slice(0, 117) + "..."
                      : item.snippet}
                  </div>
                )}
              </div>
              <button
                className="arcgis-load-btn"
                onClick={() => handleLoad(item)}
                disabled={loadingId !== null}
                aria-busy={loadingId === item.id}
                aria-label={`Load elevation data from ${item.title}`}
              >
                {loadingId === item.id ? "Loading..." : "Load"}
              </button>
            </div>
          ))}
        </div>
      )}

      {hasSearched && !searching && results.length === 0 && !error && (
        <div className="arcgis-no-results">No results found</div>
      )}
    </div>
  );
}
