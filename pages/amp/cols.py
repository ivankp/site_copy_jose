#!/usr/bin/env python

import sys, glob, sqlite3, json, re
from os.path import *

sort_re = re.compile(r'\[(\d+(?:\.\d*)?),(\d+(?:\.\d*)?)\)')
def sorter(x):
    return [ x if not i%3 else float(x) for i,x in enumerate(
      sort_re.split(x)
    )]

for f in glob.glob('data/*.db'):
    fcols = f[:-3] + '.cols'
    if '-f' not in sys.argv:
        if exists(fcols) and (getmtime(f) <= getmtime(fcols)): continue
    print f
    db = sqlite3.connect(f)
    cols = [ [x[1]] for x in db.execute(
        'pragma table_info(amplitudes)').fetchall() ][:-1]
    for col in cols:
        print col[0]
        c = [ x[0] for x in db.execute(
            'select distinct %s from amplitudes' % col[0]).fetchall() ]
        c.sort(key=sorter)
        col.append(c)

    var_ = [ x[0] for x in cols if re.match(r'^var[0-9]+$',x[0]) ]
    vals = { } # allowed variable combinations
    for i in range(len(var_)-1):
        d = { }
        for x in next(x[1] for x in cols if x[0]==var_[i]):
            print ' ', x
            d_x = [ a[0] for a in
                db.execute('select distinct %s from hist where %s="%s"' % (
                    var_[i+1], var_[i], x
                )).fetchall() ]
            d_x.sort(key=sorter)
            d[x] = d_x
        vals[var_[i]] = [var_[i+1],d]

    with open(fcols,'w') as f:
        json.dump({'cols': cols, 'vals': vals}, f, separators=(',',':'))
    db.close()
