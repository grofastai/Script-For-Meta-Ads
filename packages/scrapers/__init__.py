"""Standalone scraper scripts for ScriptSite viral content pipeline.

Run directly:
    python -m scrapers.youtube --niche optical
    python -m scrapers.apify_scraper --niche restaurant --platform instagram

Or trigger via the API:
    POST /scrape/trigger {"platform": "youtube", "niche": "optical"}
"""
