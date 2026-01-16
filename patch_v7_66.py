import re
from pathlib import Path

NEW_COLS = [7,21,27,13,9,17]
OLD_COLS = [9,23,26,12,10,20]

FILES = [Path('/mnt/data/work_v7_66/inline.js'), Path('/mnt/data/work_v7_66/_print_section.js')]

col_re = re.compile(r'(<col\s+style="width:)(\d+)(%"\s*>\s*(?:<!--.*?-->)?)')
block_re = re.compile(r'<colgroup>[\s\S]*?</colgroup>')

css_block_re = re.compile(r'(const\s+css\s*=\s*`)([\s\S]*?)(\n\s*`;)', re.MULTILINE)


def patch_colgroups(text: str) -> str:
    def repl_block(m):
        block = m.group(0)
        cols = col_re.findall(block)
        if len(cols) < 6:
            return block
        widths = [int(w) for _, w, _ in cols[:6]]
        if widths != OLD_COLS:
            return block
        i = 0
        def _sub(cm):
            nonlocal i
            if i < 6:
                neww = NEW_COLS[i]
                i += 1
                return f'{cm.group(1)}{neww}{cm.group(3)}'
            return cm.group(0)
        return col_re.sub(_sub, block)

    return block_re.sub(repl_block, text)


def patch_css_in_template(text: str) -> str:
    def repl_css(m):
        start, css, end = m.group(1), m.group(2), m.group(3)

        # Ensure body has font-size:12px
        def body_repl(bm):
            body = bm.group(0)
            if 'font-size' in body:
                return body
            return body[:-1] + ' font-size:12px; }'
        css = re.sub(r'body\{[^}]*\}', body_repl, css)

        # Remove latin font-size calc if present
        css = re.sub(r'(\.latin\{[^}]*?)\s*font-size:\s*calc\(1em\s*-\s*2px\);\s*', r'\1', css)

        inject = (
            "\n\n                /* GLOBAL: semua teks 12px (arabic & latin), kecuali kop */\n"
            "                .wrap *{ font-size:12px !important; }\n"
            "                .inst{ font-size:29px !important; }\n"
            "                .addr{ font-size:17px !important; }\n"
            "                .year{ font-size:17px !important; }\n"
        )
        if 'GLOBAL: semua teks 12px' not in css:
            css = css.rstrip() + inject

        return start + css + end

    return css_block_re.sub(repl_css, text, count=1)


for f in FILES:
    txt = f.read_text(encoding='utf-8')
    out = patch_colgroups(txt)
    out = patch_css_in_template(out)
    if out != txt:
        f.write_text(out, encoding='utf-8')

print('ok')
