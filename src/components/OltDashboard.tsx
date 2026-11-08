import React, { useState, useMemo } from 'react';
import {
  Server,
  Search,
  Filter,
  Activity,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Cpu,
  Layers,
  Database,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { OltSite, PortRecord } from '../types/olt';
import { calculateSiteStats } from '../utils/oltValidation';

interface OltDashboardProps {
  sites: OltSite[];
  allRecords: PortRecord[];
  onSelectSite: (site: OltSite) => void;
  onOpenMapModal?: (site: OltSite) => void;
}

export const OltDashboard: React.FC<OltDashboardProps> = ({
  sites,
  allRecords,
  onSelectSite,
  onOpenMapModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Compute stats for each site
  const siteStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSiteStats>>();
    sites.forEach((site) => {
      const records = allRecords.filter((r) => r.siteId === site.id);
      map.set(site.id, calculateSiteStats(records, site.totalPorts));
    });
    return map;
  }, [sites, allRecords]);

  // Overall KPIs
  const totalChassisPorts = sites.length * 128; // 17 * 128 = 2176
  const totalActivePorts = useMemo(() => {
    return allRecords.filter((r) => r.status === 'ACTIVE').length;
  }, [allRecords]);

  const totalFaults = useMemo(() => {
    return allRecords.filter((r) => r.status === 'FAULT').length;
  }, [allRecords]);

  const overallUtilization = Math.round((totalActivePorts / totalChassisPorts) * 100);

  // Region options
  const regions = useMemo(() => {
    const unique = Array.from(new Set(sites.map((s) => s.region)));
    return ['ALL', ...unique];
  }, [sites]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sites.filter((site) => {
      const matchesRegion = selectedRegion === 'ALL' || site.region === selectedRegion;
      if (!matchesRegion) return false;

      if (!query) return true;

      // Check site metadata
      const matchesSite =
        site.name.toLowerCase().includes(query) ||
        site.code.toLowerCase().includes(query) ||
        site.region.toLowerCase().includes(query) ||
        site.description.toLowerCase().includes(query) ||
        site.rackModel.toLowerCase().includes(query);

      if (matchesSite) return true;

      // Check if any record under this site matches query (e.g. search for FAT or Core)
      const siteRecords = allRecords.filter((r) => r.siteId === site.id);
      return siteRecords.some(
        (r) =>
          r.coreId.toLowerCase().includes(query) ||
          r.locationName.toLowerCase().includes(query) ||
          r.customerCircuitId?.toLowerCase().includes(query) ||
          `b${r.boardNumber}p${r.portNumber}`.includes(query)
      );
    });
  }, [sites, allRecords, searchQuery, selectedRegion]);

  return (
    <div data-testid="olt-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Hero Welcome / Summary HUD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
                Telecom Network Operations
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                17 Sites Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Optical Line Terminal (OLT) Sites
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Manage optical line terminal subracks, 8-board line cards, 16-port PON matrices, and fiber-core
              distribution records with live geolocation and Firebase synchronization.
            </p>
          </div>

          {/* Quick HUD Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
              <p className="text-[10px] text-slate-400 uppercase font-mono">OLT Sites</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">{sites.length}</p>
              <p className="text-[10px] text-cyan-400">100% Monitored</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Chassis Capacity</p>
              <p className="text-xl font-bold text-cyan-400 font-mono mt-0.5">2,176</p>
              <p className="text-[10px] text-slate-400">128 ports/site</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Mapped Cores</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{allRecords.length}</p>
              <p className="text-[10px] text-slate-400">{totalActivePorts} active links</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Alarms / High Loss</p>
              <p
                className={`text-xl font-bold font-mono mt-0.5 ${
                  totalFaults > 0 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {totalFaults}
              </p>
              <p className="text-[10px] text-slate-400">
                {totalFaults > 0 ? 'Requires inspection' : 'All links healthy'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search site name, code (KIS, RAX, HOI), core ID (Core 24), FAT location..."
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition-colors"
            aria-label="Search OLT sites and records"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Region Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-0.5 hidden sm:block" />
          {regions.map((region) => {
            const isActive = selectedRegion === region;
            return (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`text-xs px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {region === 'ALL' ? 'All Sites (17)' : region}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Server className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-200">No matching OLT sites found</h2>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query &ldquo;{searchQuery}&rdquo; or region filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRegion('ALL');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSites.map((site) => {
            const stats = siteStatsMap.get(site.id) || {
              totalConfigured: 0,
              totalActive: 0,
              totalSpare: 0,
              totalFault: 0,
              totalReserved: 0,
              utilizationPercent: 0,
            };

            return (
              <div
                key={site.id}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {site.code}
                        </span>
                        <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {site.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{site.region}</p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {site.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {site.description}
                  </p>

                  {/* Chassis Hardware & Coordinates */}
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Subrack:</span>
                      <span className="text-slate-300 truncate max-w-[190px]">{site.rackModel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Backbone:</span>
                      <span className="text-slate-300 truncate max-w-[190px]">{site.upstreamBackbone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="text-cyan-400">
                        {site.baseCoordinates.lat.toFixed(4)}°, {site.baseCoordinates.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  {/* Occupancy and Port Stats */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 text-[11px]">Chassis Port Utilization</span>
                      <span className="font-mono font-semibold text-slate-200 text-xs">
                        {stats.totalConfigured} / 128 Ports ({stats.utilizationPercent}%)
                      </span>
                    </div>

                    {/* Utilization Bar */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${(stats.totalActive / 128) * 100}%` }}
                        title={`${stats.totalActive} Active`}
                      />
                      <div
                        className="bg-cyan-500 h-full transition-all duration-300"
                        style={{ width: `${(stats.totalSpare / 128) * 100}%` }}
                        title={`${stats.totalSpare} Spare`}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${(stats.totalFault / 128) * 100}%` }}
                        title={`${stats.totalFault} Fault`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {stats.totalActive} Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {stats.totalSpare} Spare
                      </span>
                      {stats.totalFault > 0 && (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {stats.totalFault} Fault
                        </span>
                      )}
                      <span className="text-slate-400">{128 - stats.totalConfigured} Unmapped</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">8 Boards × 16 Ports</span>
                  <button
                    onClick={() => onSelectSite(site)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-500 transition-all cursor-pointer"
                    aria-label={`Open details for ${site.name} OLT site`}
                  >
                    <span>Manage Site</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
