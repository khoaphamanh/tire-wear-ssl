# Tire wear estimation with self-supervised pretraining

Results of my master's thesis at the Institute of Mechatronic Systems (imes),
Leibniz Universität Hannover: estimating the tire wear of a driverless vehicle test platform
from its sensor signals, comparing self-supervised pretraining (TFC, TS2Vec) with supervised
baselines (InceptionTime, ROCKET).

**Live site:** see the GitHub Pages link in this repository's About section.

## TL;DR

Unlabeled sensor data is abundant, labels are scarce. Pretraining on the unlabeled data and
fine-tuning on the few labels cuts the error by **54 %** compared with the best supervised
method trained on the labels alone: **0.28 mm** against **0.60 mm** mean absolute error
(no-skill reference: 0.98 mm). The gain is largest on the driving maneuver that has no label
at all in training.

## What the site shows

* **Motivation**: the test platform, its flat-spotted tires, and why labels are scarce.
* **Data**: sensor time series, windowing, labels, and the train/test split.
* **Methods**: the SSL and SL training pipelines and the loss of each method, with the
  thesis illustration of each contrastive loss term.
* **Results**: the test error of the best configuration per method.
* **Prediction explorer**: any two methods side by side, run by run and per seed.

## What is (not) published

Only results: metrics, per-run predictions and wear labels of the best configuration per
method, stored in `data/` (about 0.1 MB of JSON). Raw recordings, run metadata, and trained
weights are not included.

The JSON bundle is exported from the final multi-seed runs by a script in the (private)
thesis code repository, which recomputes every test error from the exported predictions and
stops if it does not reproduce the thesis tables.

## Layout

```
index.html                 the page
assets/css/style.css       dark theme
assets/js/*.js             one ES module per section, no build step
assets/img/                loss illustrations from the thesis (synthetic signals)
assets/vendor/             Plotly.js 2.35.2 basic bundle (MIT license)
data/summary.json          ranking and dataset facts
data/stages/*.json         per method: run-level predictions of every seed
```

## Run locally

The page loads its data with `fetch`, so it needs a local web server rather than opening
the file directly:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploying a change

GitHub Pages lets browsers cache files for 10 minutes, so a new `index.html` can meet old,
cached scripts and break. Every asset URL therefore carries a version (`?v=2`). Before each
push, bump it in `index.html`; the scripts read it from there for data and image URLs:

```bash
sed -i '' 's/?v=2"/?v=3"/g' index.html   # macOS sed; use the next number each time
```

## Contact

Anh Khoa Pham · [github.com/khoaphamanh](https://github.com/khoaphamanh)
