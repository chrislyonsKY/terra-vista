---
name: gis-professional
description: "Use this skill for any GIS, geospatial, environmental regulatory, or spatial data tasks. Triggers include: ArcGIS Pro workflows, ArcPy scripting, enterprise geodatabase management, mining permit tracking, SMIS database queries, watershed/CHIA analysis, FGDC metadata creation, Experience Builder development, spatial SQL with Oracle/SQL Server, feature class operations, map automation, GIS data inventory management, or any mention of Esri tools and Kentucky environmental/mining regulatory workflows. Also use when the user mentions DMPGIS, EEC (Energy & Environment Cabinet), permit boundaries, hydrologic analysis, geodatabase schema design, or needs help bridging legacy GIS systems with modern ArcGIS Pro approaches."
compatibility: "ArcGIS Pro 3.x, ArcPy, Python 3.9+, Oracle/SQL Server, ArcGIS Experience Builder"
author: "Chris Lyons - GIS Analyst III, Kentucky Energy & Environment Cabinet"
---

# GIS Professional Skill

## Overview

This skill encapsulates expertise in enterprise GIS workflows for environmental regulatory agencies, with specific focus on mining permit tracking, spatial analysis, and geodatabase management. It bridges legacy ArcMap workflows with modern ArcGIS Pro approaches and emphasizes production-ready automation over demo-oriented solutions.

## Core Competencies

| Domain | Technologies | Typical Tasks |
|--------|--------------|---------------|
| Desktop GIS | ArcGIS Pro, ArcMap (legacy) | Spatial analysis, cartography, data management |
| Scripting | ArcPy, Python | Automation, batch processing, ETL workflows |
| Databases | Oracle, SQL Server, Enterprise Geodatabases | Spatial queries, versioned editing, schema management |
| Web Development | Experience Builder, TypeScript | Public-facing permit visualization apps |
| Metadata | FGDC standards | Documentation, compliance, data discovery |

---

## ArcPy Scripting Patterns

### Environment Setup
```python
import arcpy
import os
from datetime import datetime

# Standard environment configuration
arcpy.env.overwriteOutput = True
arcpy.env.workspace = r"C:\GIS\Projects\CurrentProject.gdb"

# For enterprise geodatabases
sde_connection = r"C:\Users\username\AppData\Roaming\Esri\ArcGISPro\Favorites\PRODUCTION.sde"
```

### Feature Class Operations
```python
# Create feature class with proper spatial reference
sr = arcpy.SpatialReference(3089)  # Kentucky Single Zone (NAD83)

arcpy.management.CreateFeatureclass(
    out_path=arcpy.env.workspace,
    out_name="PermitBoundaries",
    geometry_type="POLYGON",
    spatial_reference=sr
)

# Add fields with domain constraints
arcpy.management.AddField("PermitBoundaries", "PERMIT_ID", "TEXT", field_length=20)
arcpy.management.AddField("PermitBoundaries", "STATUS", "TEXT", field_length=50)
arcpy.management.AddField("PermitBoundaries", "ISSUE_DATE", "DATE")
```

### Cursor Patterns (Search, Insert, Update)
```python
# Search cursor with SQL clause
fields = ["PERMIT_ID", "SHAPE@AREA", "STATUS"]
where_clause = "STATUS = 'ACTIVE' AND ISSUE_DATE > DATE '2024-01-01'"

with arcpy.da.SearchCursor("PermitBoundaries", fields, where_clause) as cursor:
    for row in cursor:
        permit_id, area_sqft, status = row
        area_acres = area_sqft / 43560
        print(f"{permit_id}: {area_acres:.2f} acres")

# Update cursor for batch modifications
with arcpy.da.UpdateCursor("PermitBoundaries", ["STATUS", "REVIEW_DATE"]) as cursor:
    for row in cursor:
        if row[0] == "PENDING":
            row[1] = datetime.now()
            cursor.updateRow(row)

# Insert cursor for new records
insert_fields = ["PERMIT_ID", "SHAPE@", "STATUS"]
with arcpy.da.InsertCursor("PermitBoundaries", insert_fields) as cursor:
    # polygon_geometry would be an arcpy.Polygon object
    cursor.insertRow(["NEW-2024-001", polygon_geometry, "SUBMITTED"])
```

### Enterprise Geodatabase Connections
```python
def get_sde_connection(database_name, version="sde.DEFAULT"):
    """
    Returns path to SDE connection file.
    Assumes connection files exist in ArcGIS Pro Favorites.
    """
    connection_folder = os.path.join(
        os.environ["APPDATA"],
        "Esri", "ArcGISPro", "Favorites"
    )
    sde_file = os.path.join(connection_folder, f"{database_name}.sde")
    
    if not os.path.exists(sde_file):
        raise FileNotFoundError(f"Connection file not found: {sde_file}")
    
    # Change version if needed
    arcpy.env.workspace = sde_file
    return sde_file

# Working with versions
def create_edit_version(parent_version, version_name):
    """Create a new version for editing."""
    arcpy.management.CreateVersion(
        in_workspace=sde_connection,
        parent_version=parent_version,
        version_name=version_name,
        access_permission="PRIVATE"
    )
    return f"sde.{version_name}"
```

---

## CHIA (Cumulative Hydrologic Impact Assessment) Workflows

### Overview
CHIA analysis evaluates the cumulative impacts of mining operations on watershed hydrology. This requires processing permit boundaries, calculating disturbed areas, and generating reports.

### Watershed Analysis Pattern
```python
def calculate_watershed_disturbance(watershed_fc, permits_fc, output_table):
    """
    Calculate mining disturbance within each watershed.
    
    Parameters:
    - watershed_fc: HUC boundaries (typically HUC12)
    - permits_fc: Mining permit boundaries
    - output_table: Output statistics table
    """
    # Intersect permits with watersheds
    intersect_output = "in_memory/permit_watershed_intersect"
    arcpy.analysis.Intersect(
        [watershed_fc, permits_fc],
        intersect_output
    )
    
    # Calculate disturbed area per watershed
    arcpy.analysis.Statistics(
        intersect_output,
        output_table,
        [["SHAPE@AREA", "SUM"]],
        case_field="HUC12"
    )
    
    # Add percentage field
    arcpy.management.AddField(output_table, "PCT_DISTURBED", "DOUBLE")
    
    # Calculate percentage (requires joining watershed areas)
    # ... additional processing
    
    return output_table
```

### Legacy System Migration
When converting from ArcMap/Access-based CHIA workflows:

1. **Data Sources**: Replace Access MDB connections with enterprise geodatabase queries
2. **Toolbox Migration**: Convert .tbx tools to Python toolboxes (.pyt)
3. **Report Generation**: Replace Access reports with ArcPy-generated outputs or ArcGIS Notebooks

```python
# Example: Migrating Access query to ArcPy
# Old: SELECT * FROM permits WHERE county = 'PIKE' (in Access)
# New: ArcPy with enterprise geodatabase

def query_permits_by_county(county_name, sde_connection):
    """Replace Access-based permit queries."""
    permits_fc = os.path.join(sde_connection, "SMIS.PERMIT_BOUNDARIES")
    
    where_clause = f"COUNTY = '{county_name.upper()}'"
    
    # Create feature layer with selection
    arcpy.management.MakeFeatureLayer(permits_fc, "permits_lyr", where_clause)
    
    count = int(arcpy.management.GetCount("permits_lyr")[0])
    print(f"Found {count} permits in {county_name} County")
    
    return "permits_lyr"
```

---

## FGDC Metadata Creation

### Automated Metadata Generation
```python
def create_fgdc_metadata(feature_class, template_xml=None):
    """
    Generate FGDC-compliant metadata for a feature class.
    
    Args:
        feature_class: Path to feature class
        template_xml: Optional template for consistent formatting
    """
    from arcpy import metadata as md
    
    # Get existing metadata
    item_md = md.Metadata(feature_class)
    
    # Set required FGDC elements
    item_md.title = os.path.basename(feature_class)
    item_md.tags = "mining, permits, Kentucky, EEC, environmental"
    item_md.summary = "Mining permit boundaries for Kentucky regulatory compliance"
    item_md.description = """
    This dataset contains mining permit boundaries maintained by the 
    Kentucky Energy and Environment Cabinet, Division of Mine Permits.
    
    Data is updated as permits are issued, modified, or terminated.
    Coordinate system: Kentucky Single Zone (NAD83), EPSG:3089
    """
    item_md.credits = "Kentucky Energy and Environment Cabinet, GIS Branch"
    item_md.accessConstraints = "Public data subject to KORA requests"
    
    # Save metadata
    item_md.save()
    
    # Export to standalone XML if needed
    if template_xml:
        item_md.exportMetadata(
            outputPath=feature_class.replace(".gdb", "_metadata.xml"),
            metadata_export_option="FGDC_CSDGM"
        )
    
    return item_md
```

---

## Experience Builder Development

### Project Structure (TypeScript)
```
widgets/
├── permit-search/
│   ├── src/
│   │   ├── runtime/
│   │   │   └── widget.tsx
│   │   ├── setting/
│   │   │   └── setting.tsx
│   │   └── config.ts
│   ├── manifest.json
│   └── icon.svg
```

### Widget Pattern (Following Christopher Moravec's approach)
```typescript
// widget.tsx
import { React, AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis'

export default function Widget(props: AllWidgetProps<any>) {
  const [permitId, setPermitId] = React.useState('')
  const [mapView, setMapView] = React.useState<JimuMapView>(null)

  const handleSearch = async () => {
    if (!mapView || !permitId) return
    
    const layer = mapView.view.map.findLayerById('permit-boundaries')
    if (!layer) return

    const query = layer.createQuery()
    query.where = `PERMIT_ID = '${permitId}'`
    query.returnGeometry = true
    
    const results = await layer.queryFeatures(query)
    if (results.features.length > 0) {
      mapView.view.goTo(results.features[0].geometry)
    }
  }

  return (
    <div className="widget-container p-3">
      <input 
        type="text"
        value={permitId}
        onChange={(e) => setPermitId(e.target.value)}
        placeholder="Enter Permit ID"
        className="form-control mb-2"
      />
      <button onClick={handleSearch} className="btn btn-primary">
        Search
      </button>
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={setMapView}
      />
    </div>
  )
}
```

### Manifest Configuration
```json
{
  "name": "permit-search",
  "label": "Permit Search",
  "type": "widget",
  "version": "1.0.0",
  "exbVersion": "1.13.0",
  "author": "GIS Branch",
  "description": "Search and zoom to mining permit boundaries",
  "properties": {
    "hasConfig": true
  },
  "jimuFramework": {
    "jimuMapView": true
  }
}
```

---

## Database Integration (Oracle/SQL Server)

### Spatial SQL Patterns
```sql
-- Oracle: Find permits within a watershed
SELECT p.PERMIT_ID, p.APPLICANT, 
       SDO_GEOM.SDO_AREA(p.SHAPE, 0.005, 'unit=ACRE') as ACRES
FROM SMIS.PERMIT_BOUNDARIES p
JOIN SMIS.WATERSHEDS w ON SDO_RELATE(p.SHAPE, w.SHAPE, 'mask=ANYINTERACT') = 'TRUE'
WHERE w.HUC12 = '051002030101';

-- SQL Server: Same query
SELECT p.PERMIT_ID, p.APPLICANT,
       p.SHAPE.STArea() / 43560 as ACRES
FROM SMIS.PERMIT_BOUNDARIES p
JOIN SMIS.WATERSHEDS w ON p.SHAPE.STIntersects(w.SHAPE) = 1
WHERE w.HUC12 = '051002030101';
```

### ArcPy with SQL Connections
```python
import arcpy
import pyodbc  # For direct SQL when needed

def get_permit_details(permit_id, connection_string):
    """
    Fetch permit details from SMIS database.
    Use when ArcPy access isn't needed.
    """
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    query = """
    SELECT PERMIT_ID, APPLICANT, ISSUE_DATE, STATUS, COUNTY
    FROM SMIS.PERMITS
    WHERE PERMIT_ID = ?
    """
    cursor.execute(query, permit_id)
    row = cursor.fetchone()
    
    conn.close()
    return row
```

---

## Geodatabase Inventory & Management

### Catalog Feature Classes
```python
def inventory_geodatabase(gdb_path, output_csv=None):
    """
    Generate inventory of all feature classes in a geodatabase.
    Useful for data management and stagnant data identification.
    """
    import csv
    from datetime import datetime
    
    arcpy.env.workspace = gdb_path
    inventory = []
    
    # Get all feature classes (including in feature datasets)
    for fc in arcpy.ListFeatureClasses():
        inventory.append(get_fc_info(fc, gdb_path))
    
    for fds in arcpy.ListDatasets(feature_type='Feature'):
        arcpy.env.workspace = os.path.join(gdb_path, fds)
        for fc in arcpy.ListFeatureClasses():
            inventory.append(get_fc_info(fc, gdb_path, fds))
    
    if output_csv:
        with open(output_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=inventory[0].keys())
            writer.writeheader()
            writer.writerows(inventory)
    
    return inventory

def get_fc_info(fc_name, gdb_path, dataset=None):
    """Get metadata about a feature class."""
    fc_path = os.path.join(gdb_path, dataset or "", fc_name)
    desc = arcpy.Describe(fc_path)
    
    return {
        "name": fc_name,
        "dataset": dataset or "Root",
        "geometry_type": desc.shapeType,
        "feature_count": int(arcpy.management.GetCount(fc_path)[0]),
        "spatial_reference": desc.spatialReference.name,
        "has_z": desc.hasZ,
        "has_m": desc.hasM,
        "path": fc_path
    }
```

### Identify Stagnant Data
```python
def find_stagnant_data(gdb_path, days_threshold=365):
    """
    Identify feature classes that haven't been updated recently.
    Requires edit tracking or a last_modified field.
    """
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.now() - timedelta(days=days_threshold)
    stagnant = []
    
    arcpy.env.workspace = gdb_path
    
    for fc in arcpy.ListFeatureClasses():
        # Check for common date fields
        fields = [f.name for f in arcpy.ListFields(fc) 
                  if f.type == 'Date']
        
        if 'LAST_EDITED_DATE' in fields or 'last_edited_date' in fields:
            date_field = 'LAST_EDITED_DATE' if 'LAST_EDITED_DATE' in fields else 'last_edited_date'
            
            # Find max date
            max_date = None
            with arcpy.da.SearchCursor(fc, [date_field]) as cursor:
                for row in cursor:
                    if row[0] and (max_date is None or row[0] > max_date):
                        max_date = row[0]
            
            if max_date and max_date < cutoff_date:
                stagnant.append({
                    "feature_class": fc,
                    "last_edit": max_date,
                    "days_stagnant": (datetime.now() - max_date).days
                })
    
    return sorted(stagnant, key=lambda x: x["days_stagnant"], reverse=True)
```

---

## Map Automation

### Map Series Generation
```python
def create_permit_map_series(project_path, layout_name, index_layer, output_folder):
    """
    Generate PDF map series for permit boundaries.
    
    Args:
        project_path: Path to .aprx file
        layout_name: Name of layout with map series enabled
        index_layer: Feature class driving the map series
        output_folder: Output directory for PDFs
    """
    aprx = arcpy.mp.ArcGISProject(project_path)
    layout = aprx.listLayouts(layout_name)[0]
    
    if not layout.mapSeries:
        raise ValueError(f"Layout '{layout_name}' does not have map series enabled")
    
    ms = layout.mapSeries
    
    # Export individual pages
    for page_num in range(1, ms.pageCount + 1):
        ms.currentPageNumber = page_num
        page_name = ms.pageRow.PERMIT_ID  # Assumes PERMIT_ID field
        
        output_path = os.path.join(output_folder, f"{page_name}.pdf")
        layout.exportToPDF(output_path, resolution=300)
        print(f"Exported: {page_name}")
    
    # Or export all as single PDF
    combined_path = os.path.join(output_folder, "All_Permits.pdf")
    layout.exportToPDF(
        combined_path,
        resolution=300,
        image_quality="BEST",
        multiple_files="PDF_SINGLE_FILE"
    )
    
    del aprx
```

---

## Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Lock errors on SDE | Multiple connections or unclosed cursors | Use `with` statements, delete cursor objects |
| Slow cursor operations | Processing millions of records | Use `arcpy.da` cursors, batch operations |
| Schema locks | Active edits or connections | Stop edit sessions, recycle connections |
| Coordinate system mismatch | Projecting on the fly | Define projection explicitly, use `arcpy.env.outputCoordinateSystem` |
| Memory errors | Large rasters or many features | Process in chunks, use `in_memory` workspace sparingly |

---

## Kentucky-Specific References

### Coordinate Systems
- **Kentucky Single Zone**: EPSG:3089 (NAD83 State Plane Kentucky FIPS 1600)
- **Kentucky North**: EPSG:2246 (legacy, NAD83)
- **Kentucky South**: EPSG:2247 (legacy, NAD83)

### Common Data Sources
- KYGEONET: Kentucky's geospatial data portal
- KyFromAbove: Aerial imagery and LiDAR
- USGS NHD: National Hydrography Dataset
- FEMA DFIRM: Flood insurance rate maps

### Regulatory Databases
- SMIS: Surface Mining Information System
- DMPGIS: Division of Mine Permits GIS

---

## AI-Assisted Development Philosophy

This skill reflects a "prompt to production" approach:

1. **AI as Amplifier**: Use AI to accelerate domain expertise, not replace it
2. **Production-Ready Focus**: Prioritize working, maintainable code over impressive demos
3. **Iterative Refinement**: Start with AI-generated scaffolding, refine with domain knowledge
4. **Documentation First**: Well-documented code is more maintainable and AI-assistable

When working with AI assistants on GIS tasks:
- Provide specific Esri function names and versions
- Include sample data structures and schemas
- Specify coordinate systems explicitly
- Reference Kentucky-specific conventions when relevant
