import requests
from bs4 import BeautifulSoup

url = "https://standardebooks.org/subjects/philosophy"
print(f"Fetching {url}...")
resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
soup = BeautifulSoup(resp.text, "html.parser")

# Print first few titles to verify relevance
titles = [t.get_text(strip=True) for t in soup.select("ol.ebooks-list li span[property='schema:name']")]
print("First 5 titles found:")
for t in titles[:5]:
    print(f"- {t}")

# Check for pagination
next_link = soup.find("a", attrs={"rel": "next"})
if next_link:
    print(f"Found next link: {next_link}")
    print(f"Href: {next_link.get('href')}")
else:
    print("No next link found")

# Check for general pagination structure
pagination = soup.find(class_="pagination") or soup.find("nav", attrs={"aria-label": "Pagination"})
if pagination:
    print("Found pagination container")
    print(pagination.prettify())
else:
    print("No pagination container found")
