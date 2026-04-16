import { useState, useRef } from "react"
import { supabase } from "../../lib/supabase"

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatPhone = v => {
  if (!v) return ""
  const d = String(v).replace(/\D/g, "").slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
}

const NUM_KEYS = [
  "total_land_acres","total_land_sqft","total_building_sqft","residential_sqft",
  "retail_space_sqft","office_space_sqft","warehouse_sqft","manufacturing_sqft",
  "comm_garage_sqft","vacant_sqft","occupancy",
  "sales_price","sales_price_per_sqft","sale_cap_rate","sale_grm",
  "price_per_unit","price_per_acre","cap_rate","grm",
  "gross_income","net_income",
  "land_assessment","bldg_assessment","total_assessment","bldg_assessment_per_sqft",
  "equalized_assessed_value","assessed_bldg_value","tif_value",
  "tax_rate","annual_tax_bill",
  "ceiling_height","land_to_bldg_ratio","latitude","longitude","proximity_to_subject",
  "num_bathrooms_per_unit","total_living_area_sqft_per_unit",
  "basement_area_sqft_per_unit","finished_bsmt_area_sqft_per_unit",
  "total_living_area_sqft","main_living_area_sqft","recreation_area_sqft",
  "attached_garage_sqft","detached_garage_sqft","basement_sqft","finished_basement_sqft",
]

const INT_KEYS = [
  "year_built","year_renovated","tax_year",
  "num_buildings","num_stories","num_residential_units","num_commercial_units",
  "total_units","num_apartments","num_parking_spaces","num_loading_docks",
  "num_bedrooms","num_full_baths","num_half_baths","num_fireplaces",
  "num_0bed_apts","num_1bed_apts","num_2bed_apts","num_3bed_apts","num_4bed_apts",
]

const DATE_KEYS = ["sale_date"]
const PARCEL_KEYS = ["parcel_id","parcel_id2","parcel_id3","parcel_id4","parcel_id5"]
const PHONE_KEYS = ["main_phone","cell_phone","company_phone"]

// ─── Column Definitions ────────────────────────────────────────────────────────

export const CONTACT_IMPORT_COLS = [
  { key:"first_name",       label:"First Name",          required:true },
  { key:"last_name",        label:"Last Name" },
  { key:"email_address",    label:"Email Address" },
  { key:"main_phone",       label:"Main Phone" },
  { key:"cell_phone",       label:"Cell Phone" },
  { key:"contact_type",     label:"Contact Type" },
  { key:"address",          label:"Mailing Address" },
  { key:"unit_suite",       label:"Mailing Unit/Suite" },
  { key:"city",             label:"Mailing City" },
  { key:"state",            label:"Mailing State" },
  { key:"zipcode",          label:"Mailing Zip" },
  { key:"notes",            label:"Notes" },
  // Company auto-create/link
  { key:"_company_name",    label:"Company Name" },
  { key:"_company_type",    label:"Company Type" },
  { key:"_company_phone",   label:"Company Phone" },
  { key:"_company_email",   label:"Company Email" },
  { key:"_company_address", label:"Company Address" },
  { key:"_company_city",    label:"Company City" },
  { key:"_company_state",   label:"Company State" },
  { key:"_company_zip",     label:"Company Zip" },
]

export const COMPANY_IMPORT_COLS = [
  { key:"company_name",    label:"Company Name",   required:true },
  { key:"company_type",    label:"Company Type" },
  { key:"company_phone",   label:"Company Phone" },
  { key:"email_address",   label:"Company Email" },
  { key:"company_website", label:"Company Website" },
  { key:"address",         label:"Mailing Address" },
  { key:"unit_suite",      label:"Mailing Unit/Suite" },
  { key:"city",            label:"Mailing City" },
  { key:"state",           label:"Mailing State" },
  { key:"zipcode",         label:"Mailing Zip" },
  { key:"notes",           label:"Notes" },
]

export const PROPERTY_IMPORT_COLS = [
  // Identification
  { key:"parcel_id",              label:"Parcel ID 1",         required:true },
  { key:"parcel_id2",             label:"Parcel ID 2" },
  { key:"parcel_id3",             label:"Parcel ID 3" },
  { key:"parcel_id4",             label:"Parcel ID 4" },
  { key:"property_name",          label:"Property Name" },
  { key:"county",                 label:"County" },
  { key:"township",               label:"Township" },
  // Location
  { key:"address",                label:"Property Address" },
  { key:"city",                   label:"City" },
  { key:"state",                  label:"State" },
  { key:"zipcode",                label:"Zip Code" },
  { key:"latitude",               label:"Latitude" },
  { key:"longitude",              label:"Longitude" },
  // Classification
  { key:"property_type",          label:"Property Type" },
  { key:"property_subtype",       label:"Property Subtype" },
  { key:"appeal_prop_type",       label:"Appeal Property Type" },
  { key:"current_use",            label:"Current Use" },
  { key:"zoning",                 label:"Zoning" },
  { key:"tax_class",              label:"Tax Class" },
  { key:"grade",                  label:"Grade" },
  { key:"condition",              label:"Condition" },
  // Building
  { key:"total_building_sqft",    label:"Building Size (SF)" },
  { key:"total_land_acres",       label:"Land Size (Acres)" },
  { key:"total_land_sqft",        label:"Land Size (SF)" },
  { key:"year_built",             label:"Year Built" },
  { key:"year_renovated",         label:"Year Renovated" },
  { key:"num_buildings",          label:"# of Buildings" },
  { key:"num_stories",            label:"# of Stories" },
  { key:"num_residential_units",  label:"# Residential Units" },
  { key:"num_commercial_units",   label:"# Commercial Units" },
  { key:"total_units",            label:"# Total Units" },
  { key:"num_parking_spaces",     label:"# Parking Spaces" },
  { key:"occupancy",              label:"Occupancy %" },
  // Financial / Tax
  { key:"sales_price",            label:"Last Sale Price" },
  { key:"sale_date",              label:"Last Sale Date" },
  { key:"sales_price_per_sqft",   label:"Last Sale Price/SF" },
  { key:"sale_cap_rate",          label:"Sale Cap Rate" },
  { key:"sale_grm",               label:"Sale GRM" },
  { key:"land_assessment",        label:"Land Assessment" },
  { key:"bldg_assessment",        label:"Building Assessment" },
  { key:"total_assessment",       label:"Total Assessment" },
  { key:"bldg_assessment_per_sqft", label:"Bldg Assessment/SF" },
  { key:"tax_code",               label:"Tax Code" },
  { key:"tax_rate",               label:"Tax Rate" },
  { key:"annual_tax_bill",        label:"Annual Tax Bill" },
  { key:"tax_year",               label:"Tax Year" },
  { key:"tif_value",              label:"TIF Value" },
  { key:"notes",                  label:"Notes" },
  // Contact / Company auto-create
  { key:"_company_name",          label:"Owner Company Name" },
  { key:"_company_phone",         label:"Owner Company Phone" },
  { key:"_company_address",       label:"Owner Company Address" },
  { key:"_company_city",          label:"Owner Company City" },
  { key:"_company_state",         label:"Owner Company State" },
  { key:"_company_zip",           label:"Owner Company Zip" },
  { key:"_contact_first_name",    label:"Contact First Name" },
  { key:"_contact_last_name",     label:"Contact Last Name" },
  { key:"_contact_phone",         label:"Contact Phone" },
  { key:"_contact_email",         label:"Contact Email" },
]

export const COMPS_IMPORT_COLS = [
  // Identification
  { key:"parcel_id",              label:"Parcel ID" },
  { key:"county",                 label:"County" },
  { key:"township",               label:"Township" },
  // Location
  { key:"address",                label:"Property Address",   required:true },
  { key:"city",                   label:"City" },
  { key:"state",                  label:"State" },
  { key:"zipcode",                label:"Zip Code" },
  // Classification
  { key:"property_type",          label:"Property Type" },
  { key:"property_subtype",       label:"Property Subtype" },
  { key:"current_use",            label:"Current Use" },
  { key:"zoning",                 label:"Zoning" },
  { key:"tax_class",              label:"Tax Class" },
  { key:"grade",                  label:"Grade" },
  // Building
  { key:"total_building_sqft",    label:"Building Size (SF)" },
  { key:"total_land_acres",       label:"Land Size (Acres)" },
  { key:"total_land_sqft",        label:"Land Size (SF)" },
  { key:"year_built",             label:"Year Built" },
  { key:"year_renovated",         label:"Year Renovated" },
  { key:"num_buildings",          label:"# of Buildings" },
  { key:"num_residential_units",  label:"# Residential Units" },
  { key:"num_commercial_units",   label:"# Commercial Units" },
  { key:"total_units",            label:"# Total Units" },
  // Sale Info
  { key:"sale_date",              label:"Sale Date",          required:true },
  { key:"sales_price",            label:"Sale Price",         required:true },
  { key:"sales_price_per_sqft",   label:"Sale Price / SF" },
  { key:"price_per_unit",         label:"Sale Price / Unit" },
  { key:"price_per_acre",         label:"Sale Price / Acre" },
  { key:"cap_rate",               label:"Cap Rate" },
  { key:"grm",                    label:"GRM" },
  { key:"occupancy",              label:"Occupancy %" },
  { key:"gross_income",           label:"Gross Income" },
  { key:"net_income",             label:"Net Income (NOI)" },
  // Parties
  { key:"seller_full_name",       label:"Seller Name" },
  { key:"buyer_full_name",        label:"Buyer Name" },
  // Assessment / Tax
  { key:"land_assessment",        label:"Land Assessment" },
  { key:"bldg_assessment",        label:"Building Assessment" },
  { key:"total_assessment",       label:"Total Assessment" },
  { key:"equalized_assessed_value", label:"EAV" },
  { key:"annual_tax_bill",        label:"Annual Tax Bill" },
  { key:"tax_year",               label:"Tax Year" },
  // Source / Notes
  { key:"data_source",            label:"Data Source" },
  { key:"notes",                  label:"Notes" },
]

// ─── Alias Maps ────────────────────────────────────────────────────────────────

export const CONTACT_EXCEL_ALIASES = {
  "first_name":       ["First Name","Given Name","Contact First Name","Contact First","FirstName"],
  "last_name":        ["Last Name","Surname","Family Name","Contact Last Name","Contact Last","LastName"],
  "email_address":    ["Email","Email Address","Work Email","Contact Email","E-mail","E-Mail","WorkEmail"],
  "main_phone":       ["Main Phone","Work Phone","Phone","Phone Number","Office Phone","Phone #","Confirmed Phone","WorkPhone"],
  "cell_phone":       ["Cell Phone","Cell","Mobile","Mobile Phone","Cell #","CellPhone"],
  "contact_type":     ["Contact Type","Type"],
  "address":          ["Mailing Address","Address","Street Address","Street"],
  "unit_suite":       ["Unit/Suite","Unit","Suite","Mailing Unit","Apt"],
  "city":             ["Mailing City","City","Contact City"],
  "state":            ["Mailing State","State","Contact State"],
  "zipcode":          ["Mailing Zip","Zip","ZIP","Zip Code","ZIP Code","Postal Code"],
  "notes":            ["Notes","Comments","Note"],
  "_company_name":    ["Company Name","Company","Employer","Organization"],
  "_company_type":    ["Company Type"],
  "_company_phone":   ["Company Phone","Org Phone"],
  "_company_email":   ["Company Email","Org Email"],
  "_company_address": ["Company Address","Org Address"],
  "_company_city":    ["Company City","Org City"],
  "_company_state":   ["Company State","Org State"],
  "_company_zip":     ["Company Zip","Company ZIP","Org Zip"],
}

export const COMPANY_EXCEL_ALIASES = {
  "company_name":    ["Company Name","Company","Organization","Business Name","Entity Name","LLC Name","Name"],
  "company_type":    ["Company Type","Type","Organization Type","Entity Type"],
  "company_phone":   ["Company Phone","Phone","Phone Number","Office Phone","Main Phone"],
  "email_address":   ["Company Email","Email","Email Address","E-mail"],
  "company_website": ["Company Website","Website","URL","Web","Website URL"],
  "address":         ["Mailing Address","Address","Street Address","Street"],
  "unit_suite":      ["Unit/Suite","Unit","Suite","Mailing Unit"],
  "city":            ["Mailing City","City"],
  "state":           ["Mailing State","State"],
  "zipcode":         ["Mailing Zip","Zip","ZIP","Zip Code","ZIP Code"],
  "notes":           ["Notes","Comments","Note"],
}

export const PROPERTY_EXCEL_ALIASES = {
  "parcel_id":             ["Parcel ID","Parcel ID 1","PIN","APN","Tax ID","Parcel Number","Parcel","Tax PIN","Tax / PIN","Tax / PIN #","PIN Number"],
  "parcel_id2":            ["Parcel ID 2","Parcel 2","PIN 2"],
  "parcel_id3":            ["Parcel ID 3","Parcel 3","PIN 3"],
  "parcel_id4":            ["Parcel ID 4","Parcel 4","PIN 4"],
  "property_name":         ["Property Name","Building Name","Name"],
  "county":                ["County"],
  "township":              ["Township","Town","TOWNSHIP"],
  "address":               ["Property Address","Address","Street Address","Street"],
  "city":                  ["City","Property City"],
  "state":                 ["State","Property State"],
  "zipcode":               ["Zip Code","ZIP Code","Zip","ZIP","Postal Code"],
  "latitude":              ["Latitude","Lat","LAT"],
  "longitude":             ["Longitude","Long","LON","LNG","Lng"],
  "property_type":         ["Property Type","Asset Type","Type","PROPERTY TYPE","Class"],
  "property_subtype":      ["Property Subtype","Subtype","Sub Type","Sub-Type"],
  "appeal_prop_type":      ["Appeal Property Type","Appeal Type","Appeal Prop Type"],
  "current_use":           ["Current Use","Use","Land Use"],
  "zoning":                ["Zoning","Zoning Code","Zoning Class"],
  "tax_class":             ["Tax Class","Class"],
  "grade":                 ["Grade","Property Grade"],
  "condition":             ["Condition","Property Condition"],
  "total_building_sqft":   ["Building Size (SF)","Building Size","Building SF","Total SF","Total Building SF","GBA","GLA","Gross Building Area","Bldg SF"],
  "total_land_acres":      ["Land Size (Acres)","Lot Size (Acres)","Lot Size Acres","Lot Size","Land Acres","Site Area (AC)","Lot (AC)"],
  "total_land_sqft":       ["Land Size (SF)","Lot Size (SF)","Lot SF","Land SF","Site Area (SF)"],
  "year_built":            ["Year Built","YearBuilt","Built","Year"],
  "year_renovated":        ["Year Renovated","Renovated","Reno Year","Year Remodeled"],
  "num_buildings":         ["# of Buildings","# Buildings","Num Buildings","Number of Buildings"],
  "num_stories":           ["# of Stories","# Stories","Stories","Num Stories","Floors"],
  "num_residential_units": ["# Residential Units","# Res Units","Residential Units","# of Residential Units"],
  "num_commercial_units":  ["# Commercial Units","# Comm Units","Commercial Units","# of Commercial Units"],
  "total_units":           ["# Total Units","# of Total Units","Total Units","# Units","Num Units","Number of Units"],
  "num_parking_spaces":    ["# Parking Spaces","Parking Spaces","Num Parking"],
  "occupancy":             ["Occupancy %","Occupancy","Occupancy Rate"],
  "sales_price":           ["Last Sale Price","Last Sold Price","Sale Price","Sold Price","Purchase Price","Last Sales Price"],
  "sale_date":             ["Last Sale Date","Last Sold Date","Sale Date","Sold Date","Date Sold"],
  "sales_price_per_sqft":  ["Last Sale Price/SF","Sale Price/SF","Sold Price/SF","Price Per SF","$/SF","PSF"],
  "sale_cap_rate":         ["Sale Cap Rate","Sold Cap Rate","Cap Rate at Sale","Cap Rate"],
  "sale_grm":              ["Sale GRM","Sold GRM","GRM"],
  "land_assessment":       ["Land Assessment","Land Assessed Value","Land Assess"],
  "bldg_assessment":       ["Building Assessment","Bldg Assessment","Improvement Assessment","Building Assessed Value"],
  "total_assessment":      ["Total Assessment","Total Assessed Value","Total Assess"],
  "bldg_assessment_per_sqft": ["Bldg Assessment/SF","Building Assessment / SF","Bldg Assessment Per SF"],
  "tax_code":              ["Tax Code"],
  "tax_rate":              ["Tax Rate","Tax Rate %"],
  "annual_tax_bill":       ["Annual Tax Bill","Tax Bill","Annual Tax","Real Estate Taxes","RE Taxes"],
  "tax_year":              ["Tax Year","Tax Yr"],
  "tif_value":             ["TIF Value","TIF Base Value","TIF"],
  "notes":                 ["Notes","Property Notes","Comments","NOTES"],
  "_company_name":         ["Owner Company Name","Company Name","Company","Owner Entity","Entity Name","LLC Name","Owner_Company"],
  "_company_phone":        ["Owner Company Phone","Company Phone","Entity Phone"],
  "_company_address":      ["Owner Company Address","Company Address","Entity Address"],
  "_company_city":         ["Owner Company City","Company City","Entity City"],
  "_company_state":        ["Owner Company State","Company State","Entity State"],
  "_company_zip":          ["Owner Company Zip","Company Zip","Entity Zip"],
  "_contact_first_name":   ["Contact First Name","Contact First","Owner First Name","Owner First"],
  "_contact_last_name":    ["Contact Last Name","Contact Last","Owner Last Name","Owner Last"],
  "_contact_phone":        ["Contact Phone","Owner Phone","Confirmed Phone"],
  "_contact_email":        ["Contact Email","Owner Email","Confirmed Email"],
}

export const COMPS_EXCEL_ALIASES = {
  "parcel_id":              ["Parcel ID","PIN","APN","Tax ID","Parcel Number","Parcel","Tax PIN"],
  "county":                 ["County"],
  "township":               ["Township"],
  "address":                ["Property Address","Address","Street Address","Street"],
  "city":                   ["City","Property City"],
  "state":                  ["State","Property State"],
  "zipcode":                ["Zip Code","Zip","ZIP","ZIP Code","Postal Code"],
  "property_type":          ["Property Type","Asset Type","Type","Class"],
  "property_subtype":       ["Property Subtype","Subtype","Sub Type"],
  "current_use":            ["Current Use","Use"],
  "zoning":                 ["Zoning","Zoning Code"],
  "tax_class":              ["Tax Class"],
  "grade":                  ["Grade"],
  "total_building_sqft":    ["Building Size (SF)","Building SF","Bldg SF","Total SF","Total Building SF","GBA","GLA","Building Size"],
  "total_land_acres":       ["Land Size (Acres)","Lot Size (Acres)","Lot Size","Lot Acres","Site Area"],
  "total_land_sqft":        ["Land Size (SF)","Lot Size (SF)","Lot SF"],
  "year_built":             ["Year Built","Built","YearBuilt"],
  "year_renovated":         ["Year Renovated","Renovated"],
  "num_buildings":          ["# of Buildings","# Buildings","Number of Buildings"],
  "num_residential_units":  ["# Residential Units","Residential Units"],
  "num_commercial_units":   ["# Commercial Units","Commercial Units"],
  "total_units":            ["# Total Units","Total Units","# Units"],
  "sale_date":              ["Sale Date","Sold Date","Closing Date","Close Date","Date Sold","Last Sale Date","Last Sold Date","COE","Transaction Date"],
  "sales_price":            ["Sale Price","Sold Price","Closing Price","Purchase Price","Sales Price","Last Sale Price","Last Sold Price","Transaction Price"],
  "sales_price_per_sqft":   ["Sale Price / SF","Sold Price/SF","Price/SF","Price Per SF","$/SF","PSF","Sale Price/SF"],
  "price_per_unit":         ["Sale Price / Unit","Price/Unit","Price Per Unit","$/Unit","PPU"],
  "price_per_acre":         ["Sale Price / Acre","Price/Acre","Price Per Acre","$/Acre"],
  "cap_rate":               ["Cap Rate","Cap","Capitalization Rate","Going-In Cap"],
  "grm":                    ["GRM","Gross Rent Multiplier","Gross Rent Multiple"],
  "occupancy":              ["Occupancy %","Occupancy","Occupancy Rate","Occ"],
  "gross_income":           ["Gross Income","Gross Revenue","GRI","Gross Rental Income"],
  "net_income":             ["Net Income (NOI)","NOI","Net Operating Income","Net Income"],
  "seller_full_name":       ["Seller Name","Seller","Seller Full Name","Grantor"],
  "buyer_full_name":        ["Buyer Name","Buyer","Buyer Full Name","Grantee"],
  "land_assessment":        ["Land Assessment","Land Assessed Value"],
  "bldg_assessment":        ["Building Assessment","Bldg Assessment","Improvement Assessment"],
  "total_assessment":       ["Total Assessment","Total Assessed Value","Total Assess"],
  "equalized_assessed_value":["EAV","Equalized Assessed Value","EAV Value"],
  "annual_tax_bill":        ["Annual Tax Bill","Tax Bill","Annual Tax","RE Taxes"],
  "tax_year":               ["Tax Year"],
  "data_source":            ["Data Source","Source","Source System"],
  "notes":                  ["Notes","Comments","Deal Notes"],
}

// ─── Auto-Match ────────────────────────────────────────────────────────────────

export const autoMatch = (sheetHeaders, importCols, aliasMap) => {
  const mapping = {}
  const used = new Set()
  // Pass 1: exact alias match (case-insensitive)
  importCols.forEach(col => {
    const aliases = (aliasMap || {})[col.key] || []
    for (const a of aliases) {
      const actual = sheetHeaders.find(h => h.trim().toLowerCase() === a.toLowerCase())
      if (actual && !used.has(actual)) {
        mapping[col.key] = actual
        used.add(actual)
        break
      }
    }
  })
  // Pass 2: fuzzy match for still-unmatched non-private fields
  importCols.forEach(col => {
    if (mapping[col.key] || col.key.startsWith("_")) return
    const needle = col.key.replace(/_/g, "").toLowerCase()
    const labelNeedle = col.label.replace(/[^a-z0-9]/gi, "").toLowerCase()
    const match = sheetHeaders.find(h => {
      if (used.has(h)) return false
      const hClean = h.replace(/[^a-z0-9]/gi, "").toLowerCase()
      if (hClean === needle || hClean === labelNeedle) return true
      if (needle.length >= 5 && hClean.includes(needle)) return true
      if (hClean.length >= 5 && needle.includes(hClean)) return true
      return false
    })
    if (match) { mapping[col.key] = match; used.add(match) }
  })
  return mapping
}

// ─── Value Extractor ───────────────────────────────────────────────────────────

const extractVal = (rawVal, key) => {
  if (rawVal === undefined || rawVal === null || rawVal === "") return null
  // Date object from SheetJS (cellDates:true)
  if (rawVal instanceof Date) {
    const y = rawVal.getUTCFullYear()
    const m = String(rawVal.getUTCMonth() + 1).padStart(2, "0")
    const d = String(rawVal.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  let s = String(rawVal).trim()
  if (!s) return null
  // ISO date strings
  if (s.includes("T")) s = s.split("T")[0]
  if (s.match(/GMT|UTC|\+|Z$/)) {
    const pd = new Date(s)
    if (!isNaN(pd)) {
      s = pd.getUTCFullYear() + "-" + String(pd.getUTCMonth()+1).padStart(2,"0") + "-" + String(pd.getUTCDate()).padStart(2,"0")
    }
  }
  // Parcel IDs: strip non-numeric
  if (PARCEL_KEYS.includes(key)) {
    s = s.replace(/[^0-9]/g, "")
    return s || null
  }
  // Numeric fields
  if (NUM_KEYS.includes(key)) {
    const n = parseFloat(String(s).replace(/[$,%*\s]/g, "").replace(/,/g, ""))
    if (isNaN(n)) return null
    return INT_KEYS.includes(key) ? Math.round(n) : n
  }
  // Integer fields
  if (INT_KEYS.includes(key)) {
    const n = parseInt(String(s).replace(/[^0-9]/g, ""), 10)
    return isNaN(n) ? null : n
  }
  // Date fields
  if (DATE_KEYS.includes(key)) {
    return s && !isNaN(Date.parse(s)) ? s : null
  }
  // Phone fields
  if (PHONE_KEYS.includes(key)) {
    return formatPhone(s)
  }
  return s || null
}

// ─── Safe column sets (prevent schema mismatches) ──────────────────────────────

const CONTACT_SAFE_COLS = new Set([
  "first_name","last_name","email_address","main_phone","cell_phone","contact_type",
  "address","unit_suite","city","state","zipcode","notes","company_id","owner_user_id",
])

const COMPANY_SAFE_COLS = new Set([
  "company_name","company_type","company_phone","email_address","company_website",
  "address","unit_suite","city","state","zipcode","notes","owner_user_id",
])

const PROPERTY_SAFE_COLS = new Set([
  "parcel_id","parcel_id2","parcel_id3","parcel_id4","parcel_id5","property_name",
  "county","township","address","city","state","zipcode","latitude","longitude",
  "property_type","property_subtype","appeal_prop_type","current_use","zoning",
  "tax_class","grade","condition","style",
  "total_building_sqft","total_land_acres","total_land_sqft","year_built","year_renovated",
  "num_buildings","num_stories","exterior_construction","ceiling_height","sprinkler_system",
  "num_residential_units","num_commercial_units","total_units","num_apartments",
  "num_parking_spaces","occupancy","apartment_mix",
  "residential_sqft","retail_space_sqft","office_space_sqft","warehouse_sqft",
  "manufacturing_sqft","comm_garage_sqft","vacant_sqft",
  "sales_price","sale_date","sales_price_per_sqft","sale_cap_rate","sale_grm",
  "land_assessment","bldg_assessment","total_assessment","bldg_assessment_per_sqft",
  "assessed_bldg_value","tax_code","tax_rate","annual_tax_bill","tax_year","tif_value",
  "num_bedrooms","num_full_baths","num_half_baths","num_fireplaces","total_living_area_sqft",
  "main_living_area_sqft","recreation_area_sqft","attached_garage_sqft","detached_garage_sqft",
  "basement_sqft","finished_basement_sqft","land_to_bldg_ratio",
  "notes","owner_user_id","neighborhood_num","market","submarket",
])

const COMPS_SAFE_COLS = new Set([
  "parcel_id","county","township","address","city","state","zipcode",
  "property_type","property_subtype","current_use","zoning","tax_class","grade","condition",
  "total_building_sqft","total_land_acres","total_land_sqft","year_built","year_renovated",
  "num_buildings","num_residential_units","num_commercial_units","total_units","num_apartments",
  "residential_sqft","retail_space_sqft","office_space_sqft","warehouse_sqft","num_parking_spaces",
  "seller_full_name","buyer_full_name",
  "sale_date","sales_price","sales_price_per_sqft","price_per_unit","price_per_acre",
  "cap_rate","grm","occupancy","gross_income","net_income",
  "land_assessment","bldg_assessment","total_assessment","equalized_assessed_value",
  "annual_tax_bill","tax_year","assessed_bldg_value","tax_rate","tax_code",
  "latitude","longitude","neighborhood_num","proximity_to_subject",
  "num_bedrooms","num_full_baths","num_half_baths","total_living_area_sqft",
  "basement_sqft","finished_basement_sqft","attached_garage_sqft","detached_garage_sqft",
  "num_0bed_apts","num_1bed_apts","num_2bed_apts","num_3bed_apts","num_4bed_apts",
  "data_source","notes","owner_user_id",
])

// ─── Main Component ────────────────────────────────────────────────────────────

export function ExcelImporter({ importType, onDone, onClose, currentUserId }) {
  const [step, setStep] = useState("upload")
  const [sheetData, setSheetData] = useState(null)
  const [mapping, setMapping] = useState({})
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] })
  const [fileName, setFileName] = useState("")
  const [mapView, setMapView] = useState("all") // all | matched | unmatched
  const fileRef = useRef()

  const COLS =
    importType === "contacts"   ? CONTACT_IMPORT_COLS :
    importType === "companies"  ? COMPANY_IMPORT_COLS :
    importType === "comps"      ? COMPS_IMPORT_COLS :
    PROPERTY_IMPORT_COLS

  const ALIASES =
    importType === "contacts"   ? CONTACT_EXCEL_ALIASES :
    importType === "companies"  ? COMPANY_EXCEL_ALIASES :
    importType === "comps"      ? COMPS_EXCEL_ALIASES :
    PROPERTY_EXCEL_ALIASES

  const TYPE_LABEL =
    importType === "contacts"   ? "Contacts" :
    importType === "companies"  ? "Companies" :
    importType === "comps"      ? "Comparable Sales" :
    "Properties"

  // ── Load SheetJS dynamically ─────────────────────────────────────────────────
  const loadSheetJS = () => new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return }
    const s = document.createElement("script")
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
    s.onload = () => resolve(window.XLSX)
    s.onerror = reject
    document.head.appendChild(s)
  })

  // ── Handle file selection ────────────────────────────────────────────────────
  const handleFile = async e => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    try {
      const XLSX = await loadSheetJS()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array", cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
      if (raw.length < 2) { alert("File appears empty."); return }

      // Detect 2-row header: if row 1 has significantly more filled cells than row 0
      let headerRowIdx = 0
      const row0NonEmpty = raw[0].filter(v => v !== "").length
      const row1NonEmpty = raw[1].filter(v => v !== "").length
      if (row1NonEmpty > row0NonEmpty * 1.5) headerRowIdx = 1

      const headers = raw[headerRowIdx].map(h => String(h).trim()).filter(Boolean)

      const fmtCell = v => {
        if (v === undefined || v === null || v === "") return ""
        if (v instanceof Date) {
          const y = v.getUTCFullYear(), m = String(v.getUTCMonth()+1).padStart(2,"0"), d = String(v.getUTCDate()).padStart(2,"0")
          return `${y}-${m}-${d}`
        }
        return String(v).trim()
      }

      const dataRows = raw.slice(headerRowIdx + 1)
        .filter(r => r.some(v => v !== ""))
        .map(r => {
          const obj = {}
          raw[headerRowIdx].forEach((h, i) => {
            const hStr = String(h || "").trim()
            if (hStr) obj[hStr] = fmtCell(r[i])
          })
          return obj
        })

      setSheetData({ headers, rows: dataRows })
      setMapping(autoMatch(headers, COLS, ALIASES))
      setStep("map")
    } catch (err) {
      alert("Could not read file: " + err.message)
    }
  }

  // ── Build a record object from a row using the current mapping ───────────────
  const buildObj = (row, safeCols) => {
    const obj = {}
    Object.entries(mapping).forEach(([key, col]) => {
      if (!col || key.startsWith("_")) return
      const val = extractVal(row[col], key)
      if (val !== null && val !== "") {
        if (safeCols.has(key)) obj[key] = val
      }
    })
    if (currentUserId) obj.owner_user_id = currentUserId
    return obj
  }

  // ── Run import ───────────────────────────────────────────────────────────────
  const runImport = async () => {
    setStep("importing")
    const total = sheetData.rows.length
    setProgress({ done: 0, total, errors: [] })
    const errors = []

    // ── CONTACTS ──────────────────────────────────────────────────────────────
    if (importType === "contacts") {
      // Pre-load companies for linking
      let { data: existingCos } = await supabase.from("companies").select("id,company_name")
      const coCache = {}
      ;(existingCos || []).forEach(c => { if (c.company_name) coCache[c.company_name.toLowerCase().trim()] = c.id })

      const BATCH = 50
      for (let i = 0; i < sheetData.rows.length; i += BATCH) {
        const slice = sheetData.rows.slice(i, i + BATCH)
        const batch = await Promise.all(slice.map(async row => {
          const obj = buildObj(row, CONTACT_SAFE_COLS)
          // Auto-create/link company
          const coName = mapping["_company_name"] ? (row[mapping["_company_name"]] || "").trim() : ""
          if (coName) {
            const coKey = coName.toLowerCase()
            if (!coCache[coKey]) {
              // Try to create company
              const newCo = { company_name: coName }
              if (mapping["_company_type"])    newCo.company_type    = row[mapping["_company_type"]]    || null
              if (mapping["_company_phone"])   newCo.company_phone   = formatPhone(row[mapping["_company_phone"]])   || null
              if (mapping["_company_email"])   newCo.email_address   = row[mapping["_company_email"]]   || null
              if (mapping["_company_address"]) newCo.address         = row[mapping["_company_address"]] || null
              if (mapping["_company_city"])    newCo.city            = row[mapping["_company_city"]]    || null
              if (mapping["_company_state"])   newCo.state           = row[mapping["_company_state"]]   || null
              if (mapping["_company_zip"])     newCo.zipcode         = row[mapping["_company_zip"]]     || null
              if (currentUserId) newCo.owner_user_id = currentUserId
              try {
                const { data: r } = await supabase.from("companies")
                  .insert([newCo])
                  .select("id")
                  .single()
                if (r) coCache[coKey] = r.id
              } catch (_) {}
            }
            if (coCache[coKey]) obj.company_id = coCache[coKey]
          }
          return obj
        }))
        const { error } = await supabase.from("contacts").insert(batch)
        if (error) errors.push(`Rows ${i+1}–${Math.min(i+BATCH, total)}: ${error.message}`)
        setProgress(p => ({ ...p, done: Math.min(i + BATCH, total), errors: [...errors] }))
      }

    // ── COMPANIES ─────────────────────────────────────────────────────────────
    } else if (importType === "companies") {
      const BATCH = 50
      for (let i = 0; i < sheetData.rows.length; i += BATCH) {
        const slice = sheetData.rows.slice(i, i + BATCH)
        const batch = slice.map(row => buildObj(row, COMPANY_SAFE_COLS)).filter(o => o.company_name)
        if (!batch.length) { setProgress(p => ({ ...p, done: Math.min(i + BATCH, total), errors: [...errors] })); continue }
        const { error } = await supabase.from("companies").insert(batch)
        if (error) errors.push(`Rows ${i+1}–${Math.min(i+BATCH, total)}: ${error.message}`)
        setProgress(p => ({ ...p, done: Math.min(i + BATCH, total), errors: [...errors] }))
      }

    // ── PROPERTIES ────────────────────────────────────────────────────────────
    } else if (importType === "properties") {
      let { data: existingCos } = await supabase.from("companies").select("id,company_name")
      const coCache = {}
      ;(existingCos || []).forEach(c => { if (c.company_name) coCache[c.company_name.toLowerCase().trim()] = c.id })

      let { data: existingContacts } = await supabase.from("contacts").select("id,first_name,last_name")
      const ctCache = {}
      ;(existingContacts || []).forEach(c => {
        const k = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase().trim()
        if (k) ctCache[k] = c.id
      })

      for (let i = 0; i < sheetData.rows.length; i++) {
        const row = sheetData.rows[i]
        const obj = buildObj(row, PROPERTY_SAFE_COLS)

        // Auto-create/link company
        const coName = mapping["_company_name"] ? (row[mapping["_company_name"]] || "").trim() : ""
        if (coName) {
          const coKey = coName.toLowerCase()
          if (!coCache[coKey]) {
            const newCo = { company_name: coName }
            if (mapping["_company_phone"])   newCo.company_phone = formatPhone(row[mapping["_company_phone"]]) || null
            if (mapping["_company_address"]) newCo.address       = row[mapping["_company_address"]] || null
            if (mapping["_company_city"])    newCo.city          = row[mapping["_company_city"]]    || null
            if (mapping["_company_state"])   newCo.state         = row[mapping["_company_state"]]   || null
            if (mapping["_company_zip"])     newCo.zipcode       = row[mapping["_company_zip"]]     || null
            if (currentUserId) newCo.owner_user_id = currentUserId
            try {
              const { data: r } = await supabase.from("companies").insert([newCo]).select("id").single()
              if (r) coCache[coKey] = r.id
            } catch (_) {}
          }
        }

        // Auto-create/link contact
        const ctFirst = mapping["_contact_first_name"] ? (row[mapping["_contact_first_name"]] || "").trim() : ""
        const ctLast  = mapping["_contact_last_name"]  ? (row[mapping["_contact_last_name"]]  || "").trim() : ""
        if (ctFirst || ctLast) {
          const fullName = [ctFirst, ctLast].filter(Boolean).join(" ")
          const ctKey = fullName.toLowerCase()
          if (!ctCache[ctKey]) {
            const newCt = { first_name: ctFirst || null, last_name: ctLast || null }
            if (mapping["_contact_phone"]) newCt.main_phone    = formatPhone(row[mapping["_contact_phone"]]) || null
            if (mapping["_contact_email"]) newCt.email_address = row[mapping["_contact_email"]] || null
            if (coName && coCache[coName.toLowerCase()]) newCt.company_id = coCache[coName.toLowerCase()]
            if (currentUserId) newCt.owner_user_id = currentUserId
            try {
              const { data: r } = await supabase.from("contacts").insert([newCt]).select("id").single()
              if (r) ctCache[ctKey] = r.id
            } catch (_) {}
          }
        }

        // Insert property
        try {
          await supabase.from("properties").insert([obj])
        } catch (e) {
          errors.push(`Row ${i+1}: ${e.message || "Insert failed"}`)
        }
        setProgress(p => ({ ...p, done: i + 1, errors: [...errors] }))
      }

    // ── COMPS ─────────────────────────────────────────────────────────────────
    } else if (importType === "comps") {
      const BATCH = 50
      for (let i = 0; i < sheetData.rows.length; i += BATCH) {
        const slice = sheetData.rows.slice(i, i + BATCH)
        const batch = slice.map(row => {
          const obj = buildObj(row, COMPS_SAFE_COLS)
          return obj
        }).filter(o => o.address || o.parcel_id)
        if (!batch.length) {
          setProgress(p => ({ ...p, done: Math.min(i + BATCH, total), errors: [...errors] }))
          continue
        }
        const { error } = await supabase.from("comps").insert(batch)
        if (error) errors.push(`Rows ${i+1}–${Math.min(i+BATCH, total)}: ${error.message}`)
        setProgress(p => ({ ...p, done: Math.min(i + BATCH, total), errors: [...errors] }))
      }
    }

    setStep("done")
  }

  // ── Derived for map step ─────────────────────────────────────────────────────
  const matchedCount  = COLS.filter(c => mapping[c.key]).length
  const unmatchedCols = COLS.filter(c => !mapping[c.key])
  const requiredUnmet = COLS.filter(c => c.required && !mapping[c.key])
  const visibleCols   =
    mapView === "matched"   ? COLS.filter(c => mapping[c.key]) :
    mapView === "unmatched" ? COLS.filter(c => !mapping[c.key]) :
    COLS

  // ── Preview value for a field ────────────────────────────────────────────────
  const previewVal = key => {
    const col = mapping[key]
    if (!col || !sheetData?.rows?.length) return ""
    const v = sheetData.rows[0][col]
    return v !== undefined && v !== null && v !== "" ? String(v).slice(0, 40) : ""
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",
    },
    modal: {
      background:"#fff",borderRadius:"12px",width:"100%",maxWidth:"900px",
      maxHeight:"90vh",display:"flex",flexDirection:"column",
      boxShadow:"0 24px 64px rgba(0,0,0,0.25)",overflow:"hidden",
    },
    header: {
      padding:"20px 24px 16px",borderBottom:"1px solid #e8eaed",
      display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
    },
    title: { fontSize:"18px",fontWeight:600,color:"#111",margin:0 },
    subtitle: { fontSize:"13px",color:"#666",marginTop:2 },
    closeBtn: {
      background:"none",border:"none",cursor:"pointer",color:"#666",
      fontSize:"22px",lineHeight:1,padding:"4px",borderRadius:"6px",
    },
    body: { flex:1,overflowY:"auto",padding:"24px" },
    footer: {
      padding:"16px 24px",borderTop:"1px solid #e8eaed",
      display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
      background:"#f9fafb",
    },
    btn: (variant="primary") => ({
      padding:"8px 18px",borderRadius:"8px",fontSize:"14px",fontWeight:500,
      cursor:"pointer",border:"none",
      ...(variant === "primary"   ? { background:"#1a73e8",color:"#fff" }   :
          variant === "danger"    ? { background:"#d93025",color:"#fff" }   :
          variant === "secondary" ? { background:"#f1f3f4",color:"#333",border:"1px solid #dadce0" } :
          { background:"#f1f3f4",color:"#333" }),
    }),
    chip: (active) => ({
      padding:"4px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:500,
      cursor:"pointer",border:"1px solid " + (active ? "#1a73e8" : "#dadce0"),
      background: active ? "#e8f0fe" : "#fff",
      color: active ? "#1a73e8" : "#666",
    }),
    table: { width:"100%",borderCollapse:"collapse",fontSize:"13px" },
    th: {
      textAlign:"left",padding:"8px 12px",background:"#f1f3f4",
      borderBottom:"1px solid #e8eaed",color:"#444",fontWeight:600,fontSize:"12px",
      position:"sticky",top:0,zIndex:1,
    },
    td: { padding:"7px 12px",borderBottom:"1px solid #f0f0f0",verticalAlign:"middle" },
    select: {
      padding:"5px 8px",borderRadius:"6px",border:"1px solid #dadce0",fontSize:"12px",
      background:"#fff",color:"#333",width:"100%",maxWidth:"240px",cursor:"pointer",
    },
    pill: (color) => ({
      display:"inline-block",padding:"2px 8px",borderRadius:"10px",fontSize:"11px",
      fontWeight:600,
      ...(color === "green"  ? { background:"#e6f4ea",color:"#1e7e34" } :
          color === "orange" ? { background:"#fff3cd",color:"#856404" } :
          color === "red"    ? { background:"#fce8e6",color:"#d93025" } :
          { background:"#f1f3f4",color:"#666" }),
    }),
    progress: {
      width:"100%",height:"8px",background:"#e8eaed",borderRadius:"4px",overflow:"hidden",
    },
    progressBar: (pct) => ({
      height:"100%",width:pct+"%",background:"#1a73e8",
      transition:"width 0.2s",borderRadius:"4px",
    }),
    dropzone: {
      border:"2px dashed #1a73e8",borderRadius:"12px",padding:"48px 24px",
      textAlign:"center",cursor:"pointer",background:"#f8f9ff",
      transition:"background 0.2s",
    },
  }

  // ─── Upload Step ──────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <div>
            <div style={S.title}>Import {TYPE_LABEL}</div>
            <div style={S.subtitle}>Upload an Excel (.xlsx) file to import records in bulk</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={S.body}>
          <div style={S.dropzone} onClick={() => fileRef.current.click()}>
            <div style={{ fontSize:"40px",marginBottom:"12px" }}>📊</div>
            <div style={{ fontSize:"16px",fontWeight:600,color:"#1a73e8",marginBottom:"6px" }}>
              Click to select an Excel file
            </div>
            <div style={{ fontSize:"13px",color:"#666" }}>
              Supports .xlsx format — first row should be column headers
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={handleFile} />
          <div style={{ marginTop:"20px",padding:"16px",background:"#f1f3f4",borderRadius:"8px",fontSize:"13px",color:"#555" }}>
            <strong>Tips for best results:</strong><br />
            • Make sure your first row contains column headers<br />
            • Dates should be in YYYY-MM-DD format or Excel date format<br />
            • Numbers should not include units (e.g., "1500" not "1,500 sqft")<br />
            • The importer will auto-match columns by name — you can adjust manually
          </div>
        </div>
        <div style={S.footer}>
          <button style={S.btn("secondary")} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )

  // ─── Map Step ─────────────────────────────────────────────────────────────
  if (step === "map") return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <div>
            <div style={S.title}>Map Columns — {TYPE_LABEL}</div>
            <div style={S.subtitle}>
              {fileName} · {sheetData.rows.length} rows · {matchedCount}/{COLS.length} fields matched
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Filter chips */}
        <div style={{ padding:"12px 24px 0",display:"flex",gap:"8px",flexShrink:0 }}>
          {["all","matched","unmatched"].map(v => (
            <button key={v} style={S.chip(mapView === v)} onClick={() => setMapView(v)}>
              {v === "all" ? `All (${COLS.length})` : v === "matched" ? `Matched (${matchedCount})` : `Unmatched (${unmatchedCols.length})`}
            </button>
          ))}
          {requiredUnmet.length > 0 && (
            <span style={{ ...S.pill("red"), marginLeft:"auto", alignSelf:"center" }}>
              {requiredUnmet.length} required field{requiredUnmet.length > 1 ? "s" : ""} missing
            </span>
          )}
          {requiredUnmet.length === 0 && matchedCount > 0 && (
            <span style={{ ...S.pill("green"), marginLeft:"auto", alignSelf:"center" }}>
              Ready to import
            </span>
          )}
        </div>

        <div style={S.body}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width:"32%"  }}>CRM Field</th>
                <th style={{ ...S.th, width:"38%" }}>Excel Column</th>
                <th style={{ ...S.th, width:"30%" }}>Preview (row 1)</th>
              </tr>
            </thead>
            <tbody>
              {visibleCols.map(col => {
                const matched = !!mapping[col.key]
                const preview = previewVal(col.key)
                return (
                  <tr key={col.key} style={{ background: col.required && !matched ? "#fff5f5" : "transparent" }}>
                    <td style={S.td}>
                      <span style={{ fontWeight: col.required ? 600 : 400, color: col.required && !matched ? "#d93025" : "#333" }}>
                        {col.label}
                      </span>
                      {col.required && <span style={{ color:"#d93025",marginLeft:3 }}>*</span>}
                      {col.key.startsWith("_") && (
                        <span style={{ ...S.pill("orange"), marginLeft:6 }}>auto-create</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <select
                        style={S.select}
                        value={mapping[col.key] || ""}
                        onChange={e => setMapping(m => ({ ...m, [col.key]: e.target.value || undefined }))}
                      >
                        <option value="">— Not mapped —</option>
                        {sheetData.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...S.td, color: preview ? "#333" : "#aaa", fontSize:"12px", fontFamily:"monospace" }}>
                      {preview || "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={S.footer}>
          <button style={S.btn("secondary")} onClick={() => setStep("upload")}>← Back</button>
          <button
            style={{ ...S.btn("primary"), opacity: requiredUnmet.length > 0 ? 0.5 : 1 }}
            disabled={requiredUnmet.length > 0}
            onClick={runImport}
          >
            Import {sheetData.rows.length} Records →
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Importing Step ───────────────────────────────────────────────────────
  if (step === "importing") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
    return (
      <div style={S.overlay}>
        <div style={{ ...S.modal, maxWidth:"480px" }}>
          <div style={S.header}>
            <div style={S.title}>Importing {TYPE_LABEL}…</div>
          </div>
          <div style={{ ...S.body, textAlign:"center" }}>
            <div style={{ marginBottom:"16px",fontSize:"32px" }}>⏳</div>
            <div style={{ marginBottom:"12px",fontSize:"14px",color:"#333" }}>
              {progress.done} / {progress.total} records processed
            </div>
            <div style={S.progress}>
              <div style={S.progressBar(pct)} />
            </div>
            <div style={{ marginTop:"8px",fontSize:"12px",color:"#666" }}>{pct}% complete</div>
            {progress.errors.length > 0 && (
              <div style={{ marginTop:"12px",fontSize:"12px",color:"#d93025" }}>
                {progress.errors.length} error{progress.errors.length > 1 ? "s" : ""} so far
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Done Step ────────────────────────────────────────────────────────────
  if (step === "done") {
    const succeeded = progress.total - progress.errors.length
    return (
      <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ ...S.modal, maxWidth:"560px" }}>
          <div style={S.header}>
            <div style={S.title}>Import Complete</div>
            <button style={S.closeBtn} onClick={onClose}>×</button>
          </div>
          <div style={S.body}>
            <div style={{ textAlign:"center",marginBottom:"20px" }}>
              <div style={{ fontSize:"40px",marginBottom:"8px" }}>
                {progress.errors.length === 0 ? "✅" : "⚠️"}
              </div>
              <div style={{ fontSize:"20px",fontWeight:600,color:"#111",marginBottom:"4px" }}>
                {succeeded} of {progress.total} {TYPE_LABEL.toLowerCase()} imported
              </div>
              {progress.errors.length > 0 && (
                <div style={{ fontSize:"13px",color:"#d93025" }}>
                  {progress.errors.length} row{progress.errors.length > 1 ? "s" : ""} had errors
                </div>
              )}
            </div>
            {progress.errors.length > 0 && (
              <div style={{ background:"#fce8e6",borderRadius:"8px",padding:"12px 16px",maxHeight:"200px",overflowY:"auto" }}>
                <div style={{ fontWeight:600,fontSize:"13px",color:"#d93025",marginBottom:"8px" }}>Errors:</div>
                {progress.errors.slice(0, 20).map((e, i) => (
                  <div key={i} style={{ fontSize:"12px",color:"#333",marginBottom:"4px",fontFamily:"monospace" }}>{e}</div>
                ))}
                {progress.errors.length > 20 && (
                  <div style={{ fontSize:"12px",color:"#666" }}>…and {progress.errors.length - 20} more</div>
                )}
              </div>
            )}
          </div>
          <div style={S.footer}>
            <div />
            <button style={S.btn("primary")} onClick={onDone}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
