    // Clean InfinityFree tracking query parameters (e.g. ?i=1) from URL bar seamlessly
    (function() {
      if (window.location.search && (window.location.search.includes('i=1') || window.location.search.includes('?i='))) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }
    })();
