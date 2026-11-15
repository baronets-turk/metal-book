#!/usr/bin/env python3
"""Compare the English pages (repo root) with the Russian ones (ru/).

Usage: python3 -I tools/i18n.py
Exit code 1 when a page pair differs in structure or a page writes a
temperature difference with the °C sign.
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK_TAGS = {'h1', 'h2', 'h3', 'p', 'li', 'dt', 'dd'}
BLOCK_DIVS = {'note', 'step', 'eyebrow'}
VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'circle', 'rect', 'line', 'path', 'polygon', 'ellipse', 'stop', 'use'}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.blocks = []
        self.ids = []
        self.footnotes = []
        self.sources = []
        self.numbers = []
        self.depth = None
        self.nav = 0

    def is_block(self, tag, attrs):
        if tag in BLOCK_TAGS:
            return True
        classes = (dict(attrs).get('class') or '').split()
        return tag == 'div' and bool(BLOCK_DIVS & set(classes))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'a' and 'fn' in (a.get('class') or '').split():
            self.footnotes.append((len(self.blocks), a.get('href')))
        if tag == 'a' and a.get('href', '').startswith('http'):
            self.sources.append(a['href'])
        if tag in VOID:
            return
        if tag == 'nav':
            self.nav += 1
        if self.depth is None and not self.nav and self.is_block(tag, attrs):
            self.depth = len(self.stack)
            self.blocks.append([tag, ''])
        self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID or tag not in self.stack:
            return
        while self.stack.pop() != tag:
            pass
        if tag == 'nav':
            self.nav -= 1
        if self.depth is not None and len(self.stack) <= self.depth:
            self.depth = None

    def handle_data(self, data):
        if self.depth is not None and 'script' not in self.stack:
            self.blocks[-1][1] += data


DIFFERENCE = re.compile(
    r'\b(?:by|на)\s+(?:about |around |roughly |примерно |около )?\d[\d–.,]*\s*°C'
    r'|\d\s*°C\s+(?:hotter|colder|warmer|cooler|higher|lower|more|less|выше|ниже|горячее|холоднее|больше|меньше)\b'
)


def load(path):
    page = Page()
    text = path.read_text(encoding='utf-8')
    page.feed(text)
    page.keys = re.findall(r'^  (\w+): ', text, re.M)
    page.differences = DIFFERENCE.findall(text.replace(' ', ' '))
    return page


def digits(text):
    return sorted(re.findall(r'\d+(?:[.,]\d+)?', text.replace(' ', ' ')))


def compare(name):
    en = load(ROOT / name)
    ru = load(ROOT / 'ru' / name)
    problems = []
    if [b[0] for b in en.blocks] != [b[0] for b in ru.blocks]:
        problems.append('blocks differ: en %d, ru %d' % (len(en.blocks), len(ru.blocks)))
        for i, (a, b) in enumerate(zip(en.blocks, ru.blocks)):
            if a[0] != b[0]:
                problems.append('  first mismatch at block %d: en <%s> "%s" / ru <%s> "%s"' % (i, a[0], a[1][:50], b[0], b[1][:50]))
                break
    else:
        for i, (a, b) in enumerate(zip(en.blocks, ru.blocks)):
            da = [d.replace(',', '.') for d in digits(a[1])]
            db = [d.replace(',', '.') for d in digits(b[1])]
            if sorted(da) != sorted(db):
                problems.append('  numbers differ in block %d: en %s / ru %s  "%s"' % (i, da, db, a[1][:60]))
    for label, a, b in (('ids', en.ids, ru.ids), ('footnotes', en.footnotes, ru.footnotes), ('links', en.sources, ru.sources), ('string keys', en.keys, ru.keys)):
        if a != b:
            problems.append('%s differ: only en %s, only ru %s' % (label, sorted(set(map(str, a)) - set(map(str, b))), sorted(set(map(str, b)) - set(map(str, a)))))
    for lang, page in (('en', en), ('ru', ru)):
        for found in page.differences:
            problems.append('%s: temperature difference written with °C (the Fahrenheit tooltip would be wrong, use words): "%s"' % (lang, found))
    print('%s: %d blocks, %s' % (name, len(en.blocks), 'OK' if not problems else 'PROBLEMS'))
    for p in problems:
        print('  ' + p)
    return not problems


def main():
    names = sorted(p.name for p in (ROOT / 'ru').glob('*.html'))
    results = [compare(n) for n in names if (ROOT / n).exists()]
    missing = [n for n in names if not (ROOT / n).exists()]
    for n in missing:
        print('%s: no English page' % n)
    sys.exit(0 if all(results) and not missing else 1)


main()
