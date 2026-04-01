import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Filter, X, SlidersHorizontal } from "lucide-react";

export interface FilterState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  riskLevel: string;
  country: string;
  symptom: string;
}

const INITIAL_FILTERS: FilterState = {
  dateFrom: undefined,
  dateTo: undefined,
  riskLevel: "all",
  country: "all",
  symptom: "all",
};

interface ObservationFiltersProps {
  observations: any[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filteredCount: number;
}

export function ObservationFilters({ observations, filters, onFiltersChange, filteredCount }: ObservationFiltersProps) {
  const [open, setOpen] = useState(true);

  const countries = useMemo(
    () => [...new Set(observations.map((o) => o.country))].filter(Boolean).sort(),
    [observations]
  );

  const symptoms = useMemo(() => {
    const all = observations.flatMap((o) => o.symptoms || []);
    return [...new Set(all)].sort();
  }, [observations]);

  const activeFilterCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.riskLevel !== "all" ? filters.riskLevel : null,
    filters.country !== "all" ? filters.country : null,
    filters.symptom !== "all" ? filters.symptom : null,
  ].filter(Boolean).length;

  const clearFilters = () => onFiltersChange(INITIAL_FILTERS);

  const update = (patch: Partial<FilterState>) => onFiltersChange({ ...filters, ...patch });

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{activeFilterCount}</Badge>
            )}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredCount} of {observations.length} reports
            </span>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {open && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !filters.dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {filters.dateFrom ? format(filters.dateFrom, "MMM dd, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(d) => update({ dateFrom: d })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !filters.dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {filters.dateTo ? format(filters.dateTo, "MMM dd, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(d) => update({ dateTo: d })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Risk Level */}
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Level</Label>
              <Select value={filters.riskLevel} onValueChange={(v) => update({ riskLevel: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={filters.country} onValueChange={(v) => update({ country: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Symptom */}
            <div className="space-y-1.5">
              <Label className="text-xs">Symptom</Label>
              <Select value={filters.symptom} onValueChange={(v) => update({ symptom: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All symptoms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symptoms</SelectItem>
                  {symptoms.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function applyFilters(observations: any[], filters: FilterState) {
  return observations.filter((obs) => {
    if (filters.dateFrom && new Date(obs.created_at) < filters.dateFrom) return false;
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(obs.created_at) > end) return false;
    }
    if (filters.riskLevel !== "all" && obs.rule_risk_level !== filters.riskLevel) return false;
    if (filters.country !== "all" && obs.country !== filters.country) return false;
    if (filters.symptom !== "all" && !(obs.symptoms || []).includes(filters.symptom)) return false;
    return true;
  });
}

export { INITIAL_FILTERS };
